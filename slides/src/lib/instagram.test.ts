import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedStats, fetchInstagramProfile, InstagramError, parseInstagramHandle, topPosts, type InstagramPost } from "./instagram";
import { pickImages } from "./creator";

const post = (over: Partial<InstagramPost>): InstagramPost => ({
  caption: "",
  type: "CAROUSEL_ALBUM",
  likes: 0,
  comments: 0,
  timestamp: "2026-09-01T00:00:00+0000",
  permalink: "",
  images: ["https://scontent.cdninstagram.com/a.jpg"],
  ...over,
});

beforeEach(() => {
  process.env.IG_USER_ID = "178414";
  process.env.IG_ACCESS_TOKEN = "token";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.IG_USER_ID;
  delete process.env.IG_ACCESS_TOKEN;
});

describe("parseInstagramHandle", () => {
  it("accepts handles and profile links", () => {
    expect(parseInstagramHandle("@Some.Creator_1")).toBe("some.creator_1");
    expect(parseInstagramHandle("creator")).toBe("creator");
    expect(parseInstagramHandle("https://www.instagram.com/creator/?hl=en")).toBe("creator");
    expect(parseInstagramHandle("instagram.com/creator")).toBe("creator");
  });

  it("rejects anything that could change the API query", () => {
    expect(parseInstagramHandle("a){followers_count}")).toBeNull();
    expect(parseInstagramHandle("a b")).toBeNull();
    expect(parseInstagramHandle("https://evil.com/creator")).toBeNull();
    expect(parseInstagramHandle("x".repeat(31))).toBeNull();
  });
});

describe("topPosts", () => {
  it("ranks carousels first, by likes plus weighted comments", () => {
    const ranked = topPosts([
      post({ permalink: "single", type: "IMAGE", likes: 9999 }),
      post({ permalink: "liked", likes: 100 }),
      post({ permalink: "discussed", likes: 50, comments: 20 }),
      post({ permalink: "video", type: "VIDEO", likes: 5000, images: [] }),
    ]);
    expect(ranked.map((p) => p.permalink)).toEqual(["discussed", "liked", "single"]);
  });
});

describe("feedStats", () => {
  it("summarises engagement and cadence", () => {
    const stats = feedStats({
      username: "c",
      followers: 1000,
      mediaCount: 3,
      posts: [
        post({ likes: 10, timestamp: "2026-09-01T00:00:00+0000" }),
        post({ likes: 20, type: "IMAGE", timestamp: "2026-09-08T00:00:00+0000" }),
        post({ likes: 30, timestamp: "2026-09-15T00:00:00+0000" }),
      ],
    });
    expect(stats.medianEngagement).toBe(20);
    expect(stats.postsPerWeek).toBe(1.5);
    expect(stats.carouselShare).toBe(67);
  });
});

describe("fetchInstagramProfile", () => {
  it("reads the account through Business Discovery", async () => {
    let called = "";
    vi.stubGlobal("fetch", async (url: URL) => {
      called = decodeURIComponent(url.toString());
      return Response.json({
        business_discovery: {
          username: "creator",
          followers_count: 5000,
          media_count: 2,
          media: {
            data: [
              {
                media_type: "CAROUSEL_ALBUM",
                caption: "3 mistakes",
                like_count: 40,
                comments_count: 4,
                media_url: "https://x.cdninstagram.com/cover.jpg",
                children: { data: [{ media_type: "IMAGE", media_url: "https://x.cdninstagram.com/1.jpg" }, { media_type: "VIDEO" }] },
              },
              { media_type: "CAROUSEL_ALBUM", media_url: "https://x.cdninstagram.com/only-cover.jpg" },
            ],
          },
        },
      });
    });
    const profile = await fetchInstagramProfile("creator");
    expect(called).toContain("business_discovery.username(creator)");
    expect(called.startsWith("https://graph.facebook.com/")).toBe(true);
    expect(profile.followers).toBe(5000);
    expect(profile.posts[0].images).toEqual(["https://x.cdninstagram.com/1.jpg"]);
    // Without children the album's own image (its first slide) is used.
    expect(profile.posts[1].images).toEqual(["https://x.cdninstagram.com/only-cover.jpg"]);
  });

  it("maps Graph API errors to clear codes", async () => {
    const cases: [number, object, InstagramError["code"]][] = [
      [400, { error: { code: 110, error_subcode: 2207013 } }, "not_found"],
      [400, { error: { code: 190 } }, "token_expired"],
      [403, { error: { code: 4 } }, "rate_limited"],
      [500, { error: { code: 2 } }, "failed"],
    ];
    for (const [status, body, code] of cases) {
      vi.stubGlobal("fetch", async () => Response.json(body, { status }));
      await expect(fetchInstagramProfile("creator")).rejects.toMatchObject({ code });
    }
  });

  it("refuses to run without credentials", async () => {
    delete process.env.IG_ACCESS_TOKEN;
    await expect(fetchInstagramProfile("creator")).rejects.toMatchObject({ code: "not_configured" });
  });
});

describe("pickImages", () => {
  const img = (n: string) => ({ data: n, mediaType: "image/jpeg" as const });
  it("keeps the first slides and the last one within the budget", () => {
    const picked = pickImages(
      [{ label: "a", images: ["1", "2", "3", "4", "5", "6", "7"].map(img) }, { label: "b", images: [img("x")] }],
      8,
    );
    expect(picked[0].images.map((i) => i.data)).toEqual(["1", "2", "3", "7"]);
    expect(picked[1].images).toHaveLength(1);
    expect(picked.reduce((n, s) => n + s.images.length, 0)).toBeLessThanOrEqual(8);
  });
});
