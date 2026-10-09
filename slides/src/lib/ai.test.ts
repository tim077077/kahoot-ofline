import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiProvider, geminiSchema, structured } from "./ai";
import { ClaudeError } from "./claude";
import { CreatorSchema } from "./creator";
import { ReportSchema } from "./performance";
import { CURATED_SPECS, SpecSchema } from "./spec";
import { SlideshowSchema, writeSlideshow } from "./writer";

const KEYS = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "AI_PROVIDER"] as const;

beforeEach(() => KEYS.forEach((k) => delete process.env[k]));
afterEach(() => vi.unstubAllGlobals());

describe("aiProvider", () => {
  it("picks whichever key is set, Claude first, AI_PROVIDER overrides", () => {
    expect(aiProvider()).toBeNull();
    process.env.GOOGLE_API_KEY = "g";
    expect(aiProvider()).toBe("gemini");
    process.env.ANTHROPIC_API_KEY = "a";
    expect(aiProvider()).toBe("claude");
    process.env.AI_PROVIDER = "gemini";
    expect(aiProvider()).toBe("gemini");
    delete process.env.GOOGLE_API_KEY;
    expect(aiProvider()).toBe("claude"); // asked for Gemini but no Gemini key
  });
});

// Gemini's responseJsonSchema accepts only these keywords.
const SUPPORTED = new Set([
  "$id", "$defs", "$ref", "$anchor", "type", "format", "title", "description", "enum", "items", "prefixItems",
  "minItems", "maxItems", "minimum", "maximum", "anyOf", "oneOf", "properties", "additionalProperties", "required", "propertyOrdering",
]);
function keywords(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => keywords(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      out.add(k);
      if (k === "properties" || k === "$defs") Object.values(v as object).forEach((n) => keywords(n, out));
      else keywords(v, out);
    }
  }
  return out;
}

describe("geminiSchema", () => {
  it.each([
    ["spec", SpecSchema],
    ["creator", CreatorSchema],
    ["slideshow", SlideshowSchema],
    ["report", ReportSchema],
  ])("%s schema only uses keywords Gemini supports", (_, schema) => {
    const unsupported = [...keywords(geminiSchema(schema))].filter((k) => !SUPPORTED.has(k));
    expect(unsupported).toEqual([]);
  });
});

function geminiReply(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("structured() with Gemini", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("sends system, images and the JSON schema, and validates the answer", async () => {
    const answer = { slides: ["hook", "two", "three"], caption: "cap", hashtags: ["#a", "b"] };
    const fetchMock = geminiReply({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(answer) }] }, finishReason: "STOP" }] });

    const out = await structured({
      system: "be brief",
      content: [
        { type: "image", mediaType: "image/png", data: "AAAA" },
        { type: "text", text: "go" },
      ],
      schema: SlideshowSchema,
      effort: "low",
      what: "this",
    });
    expect(out).toEqual(answer);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain(":generateContent");
    expect(String(url)).toContain("gemini-flash-latest");
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction.parts[0].text).toBe("be brief");
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/png", data: "AAAA" });
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.properties.slides.type).toBe("array");
  });

  it("turns a safety block into a refusal", async () => {
    geminiReply({ candidates: [{ finishReason: "SAFETY" }] });
    await expect(structured({ system: "", content: [{ type: "text", text: "x" }], schema: SlideshowSchema, effort: "low", what: "this" })).rejects.toMatchObject({
      code: "refused",
    });
  });

  it("rejects an answer of the wrong shape", async () => {
    geminiReply({ candidates: [{ content: { parts: [{ text: '{"slides":"nope"}' }] }, finishReason: "STOP" }] });
    const err = await structured({ system: "", content: [{ type: "text", text: "x" }], schema: SlideshowSchema, effort: "low", what: "this" }).catch((e) => e);
    expect(err).toBeInstanceOf(ClaudeError);
    expect(err.code).toBe("failed");
  });

  it("drives a real feature end to end (the writer)", async () => {
    geminiReply({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ slides: ["a", "b", "c", "d"], caption: "c", hashtags: ["#x"] }) }] }, finishReason: "STOP" }],
    });
    const spec = CURATED_SPECS[0];
    const { slideshow, mock } = await writeSlideshow({ name: spec.name, formula: spec.formula, exampleSlides: spec.exampleSlides, topic: "dogs", slideCount: 3 });
    expect(mock).toBe(false);
    expect(slideshow.slides).toEqual(["a", "b", "c"]);
    expect(slideshow.hashtags).toEqual(["x"]);
  });
});
