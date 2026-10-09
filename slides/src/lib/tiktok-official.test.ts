import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./store";
import { accessToken, checkState, authorizeUrl, explainError, publicSlideUrls, sendToDrafts, verifySlideSignature } from "./tiktok-official";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  process.env.TIKTOK_CLIENT_KEY = "key";
  process.env.TIKTOK_CLIENT_SECRET = "secret";
  process.env.SLIDEDROP_PUBLIC_URL = "https://slides.example.com/";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TIKTOK_CLIENT_KEY;
  delete process.env.TIKTOK_CLIENT_SECRET;
  delete process.env.SLIDEDROP_PUBLIC_URL;
});

const connect = (expiresIn: number) =>
  store.set(
    "tiktok:auth",
    JSON.stringify({ accessToken: "old", refreshToken: "r", expiresAt: Date.now() + expiresIn, refreshExpiresAt: Date.now() + 1e9, openId: "o", scope: "video.upload" }),
  );

describe("official TikTok drafts", () => {
  it("builds the login link with a one-time state", async () => {
    const url = new URL(await authorizeUrl(store));
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/v2/auth/authorize/");
    expect(url.searchParams.get("scope")).toContain("video.upload");
    expect(url.searchParams.get("redirect_uri")).toBe("https://slides.example.com/api/tiktok/callback");
    const state = url.searchParams.get("state");
    expect(await checkState(store, "wrong")).toBe(false);
    // A failed check burns the state too.
    expect(await checkState(store, state)).toBe(false);
  });

  it("signs slide URLs and rejects forged signatures", async () => {
    const [first] = await publicSlideUrls(store, "p_abc123", 2);
    expect(first.startsWith("https://slides.example.com/api/posts/p_abc123/slides/1?sig=")).toBe(true);
    const sig = new URL(first).searchParams.get("sig");
    expect(await verifySlideSignature(store, "p_abc123", 1, sig)).toBe(true);
    expect(await verifySlideSignature(store, "p_abc123", 2, sig)).toBe(false);
    expect(await verifySlideSignature(store, "p_abc123", 1, "0".repeat(32))).toBe(false);
  });

  it("sends a photo post to the inbox (MEDIA_UPLOAD) from public URLs", async () => {
    await connect(3600_000);
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return Response.json({ data: { publish_id: "pub_1" }, error: { code: "ok" } });
    });
    expect(await sendToDrafts(store, { id: "p_abc123", title: "Hook", caption: "#x", slideCount: 3 })).toBe("pub_1");
    expect(body).toMatchObject({ media_type: "PHOTO", post_mode: "MEDIA_UPLOAD", post_info: { title: "Hook", description: "#x" } });
    expect((body.source_info as { photo_images: string[] }).photo_images).toHaveLength(3);
  });

  it("refreshes a token about to expire", async () => {
    await connect(60_000);
    vi.stubGlobal("fetch", async () => Response.json({ access_token: "new", refresh_token: "r2", expires_in: 86400, refresh_expires_in: 1e6 }));
    expect(await accessToken(store)).toBe("new");
    expect(JSON.parse((await store.get("tiktok:auth"))!).refreshToken).toBe("r2");
  });

  it("explains the errors you'll actually hit", () => {
    expect(explainError("spam_risk_too_many_pending_share")).toContain("5 drafts");
    expect(explainError("url_ownership_unverified")).toContain("verify");
  });
});
