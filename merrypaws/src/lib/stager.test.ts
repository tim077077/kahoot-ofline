import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Gemini SDK talks over fetch, so a fake fetch stands in for Google.
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("generateImage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the photo and prompt to Google and returns the image bytes", async () => {
    const fetch = vi.fn(async () => reply({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png } }] }, finishReason: "STOP" }] }));
    vi.stubGlobal("fetch", fetch);
    const { generateImage } = await import("./stager");
    const out = await generateImage([new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" })], "a portrait");

    expect(out).toMatchObject({ mimeType: "image/png", mock: false, model: "gemini-nano-banana-2.1" });
    expect(out.bytes.toString("base64")).toBe(png);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-nano-banana-2.1:generateContent");
    const sent = JSON.parse(String(init.body));
    expect(sent.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/jpeg", data: "AQI=" });
    expect(sent.contents[0].parts[1].text).toBe("a portrait");
    expect(sent.generationConfig.imageConfig).toEqual({ aspectRatio: "4:5", imageSize: "1K" });
  });

  it("falls back to the second model when the first errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ error: { code: 503, message: "overloaded", status: "UNAVAILABLE" } }, 503))
      .mockResolvedValue(reply({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png } }] } }] }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { generateImage } = await import("./stager");
    const out = await generateImage([new Blob([new Uint8Array([1])], { type: "image/jpeg" })], "p");
    expect(out.model).toBe("gemini-3.1-flash-image");
  });

  it("doesn't pay for a second try when the photo is refused", async () => {
    const fetch = vi.fn(async () => reply({ candidates: [{ finishReason: "IMAGE_SAFETY" }] }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { generateImage } = await import("./stager");
    await expect(generateImage([new Blob([new Uint8Array([1])], { type: "image/jpeg" })], "p")).rejects.toThrow("refused");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
