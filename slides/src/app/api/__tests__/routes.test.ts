import { beforeEach, describe, expect, it } from "vitest";
import { CURATED_SPECS, SpecSchema } from "@/lib/spec";
import { MemoryStore } from "@/lib/store";
import { POST as analyze } from "../analyze/route";
import { POST as write } from "../write/route";

// Without ANTHROPIC_API_KEY the routes run in demo mode, which exercises
// validation, limits and response shapes without calling the API.
beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  (globalThis as unknown as { __appStore: MemoryStore }).__appStore = new MemoryStore();
});

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/write", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
    body: JSON.stringify(body),
  });

describe("/api/write", () => {
  it("writes a slideshow in the requested format", async () => {
    const spec = CURATED_SPECS[0];
    const res = await write(
      jsonRequest({ name: spec.name, formula: spec.formula, exampleSlides: spec.exampleSlides, topic: "dogs", slideCount: 5 }),
    );
    const data = (await res.json()) as { slides: string[]; mock: boolean };
    expect(res.status).toBe(200);
    expect(data.mock).toBe(true);
    expect(data.slides.length).toBe(5);
  });

  it("rejects a request without a topic or format", async () => {
    expect((await write(jsonRequest({ topic: "dogs" }))).status).toBe(400);
    expect((await write(jsonRequest({ name: "x", formula: "y", topic: "  " }))).status).toBe(400);
  });
});

describe("/api/analyze", () => {
  it("returns a valid spec for uploaded screenshots", async () => {
    const form = new FormData();
    form.append("screenshot", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "a.jpg");
    const res = await analyze(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
    const data = (await res.json()) as { spec: unknown };
    expect(res.status).toBe(200);
    expect(() => SpecSchema.parse(data.spec)).not.toThrow();
  });

  it("rejects non-image uploads", async () => {
    const form = new FormData();
    form.append("screenshot", new Blob(["hello"], { type: "text/plain" }), "a.txt");
    const res = await analyze(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });
});
