import type { Screenshot } from "@/lib/analyze";
import { ClaudeError } from "@/lib/claude";
import { LIMITS } from "@/lib/config";
import { analyzeCreator, type CreatorSample } from "@/lib/creator";
import { releaseAiCall, takeAiCall } from "@/lib/limits";
import { clientIp, storeOr503 } from "@/lib/http";
import { fetchImage } from "@/lib/images";
import {
  feedStats,
  fetchInstagramProfile,
  IMAGE_HOST_SUFFIXES,
  InstagramError,
  instagramConfigured,
  parseInstagramHandle,
  topPosts,
} from "@/lib/instagram";
import { fetchTikTokPost, parseTikTokUrl } from "@/lib/tiktok";

export const maxDuration = 120;

const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_LINKS = 10;
const TIKTOK_NAME = /^[a-z0-9._]{2,24}$/;

const fail = (error: string, status: number) => Response.json({ error }, { status });
const count = (n: number) => n.toLocaleString("en-US");

// "@name" or "https://www.tiktok.com/@name" → "name".
function parseTikTokHandle(raw: string): string | null {
  let input = raw.trim();
  if (/^((www|m)\.)?tiktok\.com\//i.test(input)) input = `https://${input}`;
  const url = parseTikTokUrl(input);
  if (url) input = url.pathname.split("/").find((p) => p.startsWith("@")) ?? "";
  const name = input.replace(/^@/, "").toLowerCase();
  return TIKTOK_NAME.test(name) ? name : null;
}

type Gathered = { username: string; samples: CreatorSample[]; stats: string[]; postsRead: number; source: object };

async function gatherInstagram(handle: string): Promise<Gathered | Response> {
  const username = parseInstagramHandle(handle);
  if (!username) return fail("bad_handle", 400);
  if (!instagramConfigured()) return fail("instagram_not_configured", 503);

  let profile;
  try {
    profile = await fetchInstagramProfile(username);
  } catch (err) {
    if (!(err instanceof InstagramError)) throw err;
    const map = {
      not_configured: ["instagram_not_configured", 503],
      not_found: ["creator_not_found", 404],
      rate_limited: ["instagram_busy", 429],
      token_expired: ["instagram_token_expired", 503],
      failed: ["instagram_failed", 502],
    } as const;
    if (err.code === "failed") console.error("instagram failed", err.message);
    const [error, status] = map[err.code];
    return fail(error, status);
  }

  const best = topPosts(profile.posts, 4);
  const samples = await Promise.all(
    best.map(async (post, i) => {
      // First four slides and the last: hook, format, call to action.
      const urls = post.images.length > 5 ? [...post.images.slice(0, 4), post.images[post.images.length - 1]] : post.images;
      const images = (await Promise.all(urls.map((u) => fetchImage(u, IMAGE_HOST_SUFFIXES)))).filter((x): x is Screenshot => Boolean(x));
      const kind = post.type === "CAROUSEL_ALBUM" ? `carousel, ${post.images.length} slides` : "single image";
      return { label: `Top post ${i + 1} (${kind}): ${count(post.likes)} likes, ${count(post.comments)} comments`, caption: post.caption, images };
    }),
  );
  const stats = feedStats(profile);
  return {
    username: profile.username,
    samples: samples.filter((s) => s.images.length > 0),
    postsRead: stats.postsRead,
    stats: [
      `Followers: ${count(stats.followers)}. Posts read: ${stats.postsRead} (most recent).`,
      `Median likes + comments per post: ${count(stats.medianEngagement)}.`,
      `Carousels: ${stats.carouselShare}% of posts. Posts per week: ${stats.postsPerWeek ?? "unknown"}.`,
      "The posts below are the top carousels by engagement (comments weighted 3x).",
    ],
    source: {
      platform: "instagram",
      username: profile.username,
      followers: stats.followers,
      postsRead: stats.postsRead,
      top: best.map((p) => ({ permalink: p.permalink, likes: p.likes, comments: p.comments })),
    },
  };
}

async function gatherTikTok(handle: string, links: string[]): Promise<Gathered | Response> {
  if (handle && !parseTikTokHandle(handle)) return fail("bad_handle", 400);
  if (links.some((l) => !parseTikTokUrl(l))) return fail("bad_link", 400);

  const results = await Promise.allSettled(links.map((l) => fetchTikTokPost(l)));
  const posts = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (links.length > 0 && posts.length === 0) return fail("link_unavailable", 422);

  const username = parseTikTokHandle(handle) ?? posts.find((p) => p.author)?.author.toLowerCase() ?? "creator";
  return {
    username,
    samples: posts.map((p, i) => ({ label: `Post ${i + 1} (cover slide only)`, caption: p.caption, images: p.cover ? [p.cover] : [] })),
    postsRead: posts.length,
    stats: [
      "TikTok's official embed gives each post's cover slide and caption, but no numbers and no other slides.",
      "The user picked these posts as this creator's best. If a profile-grid screenshot is included, read the view counts from it and weigh the format of the highest-viewed posts.",
      links.length > posts.length ? `${links.length - posts.length} of the links couldn't be read (private or deleted).` : "",
    ].filter(Boolean),
    source: { platform: "tiktok", username, postsRead: posts.length },
  };
}

// Copy a creator: read one account's best slideshows and make a template.
// Instagram reads the account by name (official API, needs your token).
// TikTok has no official way to list someone's posts, so it takes post links
// and screenshots (a profile-grid screenshot shows the view counts).
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const form = await request.formData().catch(() => null);
  const platform = String(form?.get("platform") ?? "");
  const handle = String(form?.get("handle") ?? "").trim().slice(0, 200);
  const links = (form?.getAll("link") ?? [])
    .map((l) => String(l).trim())
    .filter(Boolean)
    .map((l) => (/^[a-z]+:\/\//i.test(l) ? l : `https://${l}`));
  const files = (form?.getAll("screenshot") ?? []).filter((f): f is File => f instanceof Blob);

  if (platform !== "instagram" && platform !== "tiktok") return fail("bad_request", 400);
  if (links.length > MAX_LINKS || files.length > LIMITS.maxSlides) return fail("bad_request", 400);
  if (files.some((f) => !TYPES.includes(f.type as (typeof TYPES)[number]) || f.size > MAX_BYTES)) return fail("bad_request", 400);
  if (platform === "instagram" && !handle) return fail("bad_handle", 400);
  if (platform === "tiktok" && links.length === 0 && files.length === 0) return fail("tiktok_needs_posts", 400);

  const gathered = platform === "instagram" ? await gatherInstagram(handle) : await gatherTikTok(handle, links);
  if (gathered instanceof Response) return gathered;

  const uploaded: Screenshot[] = await Promise.all(
    files.map(async (f) => ({ data: Buffer.from(await f.arrayBuffer()).toString("base64"), mediaType: f.type as Screenshot["mediaType"] })),
  );
  const samples = [...gathered.samples.filter((s) => s.images.length > 0)];
  if (uploaded.length > 0) samples.push({ label: "Screenshots the user added (a profile grid or individual slides)", images: uploaded });
  if (samples.length === 0) return fail("creator_no_images", 422);

  const ip = clientIp(request);
  if (!(await takeAiCall(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return fail("limit_reached", 429);
  }

  try {
    const { spec, insights, mock } = await analyzeCreator({
      platform,
      username: gathered.username,
      stats: gathered.stats,
      samples,
      postsRead: gathered.postsRead,
    });
    return Response.json({ spec: { ...spec, creator: insights }, mock, source: gathered.source });
  } catch (err) {
    await releaseAiCall(store, ip);
    if (err instanceof ClaudeError && err.code === "refused") return fail("refused", 422);
    console.error("creator analysis failed", err);
    return fail("generation_failed", 502);
  }
}
