import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTikTokPost, parseTikTokUrl, TikTokLinkError } from "./tiktok";

afterEach(() => vi.unstubAllGlobals());

describe("parseTikTokUrl", () => {
  it("accepts TikTok post and short links", () => {
    expect(parseTikTokUrl("https://www.tiktok.com/@someone/photo/7412345678901234567")).not.toBeNull();
    expect(parseTikTokUrl("  https://vm.tiktok.com/ZMabc123/ ")).not.toBeNull();
  });

  it("rejects other hosts, lookalikes and plain http", () => {
    expect(parseTikTokUrl("https://evil.com/?u=tiktok.com")).toBeNull();
    expect(parseTikTokUrl("https://tiktok.com.evil.com/@x")).toBeNull();
    expect(parseTikTokUrl("http://www.tiktok.com/@x")).toBeNull();
    expect(parseTikTokUrl("not a url")).toBeNull();
  });
});

describe("fetchTikTokPost", () => {
  it("returns the caption and cover from oEmbed", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.startsWith("https://www.tiktok.com/oembed")) {
        return Response.json({ title: "5 things I wish I knew", author_name: "creator", thumbnail_url: "https://p16-sign.tiktokcdn.com/cover.jpeg" });
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    });

    const post = await fetchTikTokPost("https://www.tiktok.com/@creator/photo/1");
    expect(post.caption).toBe("5 things I wish I knew");
    expect(post.author).toBe("creator");
    expect(post.cover?.mediaType).toBe("image/jpeg");
    expect(calls[0]).toContain(encodeURIComponent("https://www.tiktok.com/@creator/photo/1"));
  });

  it("never downloads a cover from a host outside TikTok's CDN", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return Response.json({ title: "x", thumbnail_url: "https://169.254.169.254/latest/meta-data" });
    });

    const post = await fetchTikTokPost("https://www.tiktok.com/@a/photo/1");
    expect(post.cover).toBeUndefined();
    expect(calls).toHaveLength(1);
  });

  it("fails clearly for private or deleted posts", async () => {
    vi.stubGlobal("fetch", async () => new Response("not found", { status: 404 }));
    await expect(fetchTikTokPost("https://www.tiktok.com/@a/photo/1")).rejects.toBeInstanceOf(TikTokLinkError);
  });
});
