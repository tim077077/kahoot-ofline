import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURATED_SPECS, SpecSchema } from "@/lib/spec";
import { MemoryStore } from "@/lib/store";
import { POST as analyze } from "../analyze/route";
import { POST as creatorPost } from "../creator/route";
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

describe("/api/creator", () => {
  const creator = (fields: Record<string, string | string[]>, files = 0) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) for (const item of [v].flat()) form.append(k, item);
    for (let i = 0; i < files; i++) form.append("screenshot", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "g.jpg");
    return creatorPost(new Request("http://localhost/api/creator", { method: "POST", body: form, headers: { "x-forwarded-for": "8.8.8.8" } }));
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.IG_USER_ID;
    delete process.env.IG_ACCESS_TOKEN;
  });

  it("says plainly when Instagram isn't set up", async () => {
    const res = await creator({ platform: "instagram", handle: "@creator" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "instagram_not_configured" });
  });

  it("reads an Instagram creator's top carousels into a template with insights", async () => {
    process.env.IG_USER_ID = "1";
    process.env.IG_ACCESS_TOKEN = "t";
    const fetched: string[] = [];
    vi.stubGlobal("fetch", async (url: URL | string) => {
      fetched.push(url.toString());
      if (url.toString().startsWith("https://graph.facebook.com/")) {
        return Response.json({
          business_discovery: {
            username: "creator",
            followers_count: 900,
            media: {
              data: [
                {
                  media_type: "CAROUSEL_ALBUM",
                  like_count: 10,
                  children: { data: [{ media_type: "IMAGE", media_url: "https://a.cdninstagram.com/1.jpg" }] },
                },
                { media_type: "IMAGE", like_count: 1, media_url: "https://169.254.169.254/latest" },
              ],
            },
          },
        });
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    });
    const res = await creator({ platform: "instagram", handle: "instagram.com/creator" });
    const data = (await res.json()) as { spec: { creator: { username: string } }; mock: boolean; source: { followers: number } };
    expect(res.status).toBe(200);
    expect(data.mock).toBe(true);
    expect(data.spec.creator.username).toBe("creator");
    expect(data.source.followers).toBe(900);
    expect(fetched.some((u) => u.includes("169.254"))).toBe(false);
  });

  it("asks for TikTok post links instead of pretending to read a profile", async () => {
    const res = await creator({ platform: "tiktok", handle: "@creator" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "tiktok_needs_posts" });
  });

  it("builds a TikTok creator template from a profile-grid screenshot", async () => {
    const res = await creator({ platform: "tiktok", handle: "@creator" }, 1);
    const data = (await res.json()) as { spec: unknown };
    expect(res.status).toBe(200);
    expect(() => SpecSchema.parse(data.spec)).not.toThrow();
  });

  it("rejects bad handles and non-TikTok links", async () => {
    expect((await creator({ platform: "instagram", handle: "a){x}" })).status).toBe(400);
    expect((await creator({ platform: "tiktok", link: "https://evil.com/x" })).status).toBe(400);
    expect((await creator({ platform: "facebook", handle: "a" })).status).toBe(400);
  });
});
