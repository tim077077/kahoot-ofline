import { ClaudeError } from "@/lib/claude";
import { LIMITS } from "@/lib/config";
import { analyzeCreator } from "@/lib/creator";
import { forbidCrossSite, clientIp, storeOr503 } from "@/lib/http";
import { fetchImage } from "@/lib/images";
import { hashtagTopCarousels, IMAGE_HOST_SUFFIXES, InstagramError, instagramFailure, parseHashtag, type InstagramPost } from "@/lib/instagram";
import { releaseAiCall, takeAiCall } from "@/lib/limits";
import type { Screenshot } from "@/lib/analyze";

export const maxDuration = 120;

// Results are kept 6 hours: Meta allows 30 different hashtags per 7 days, and
// a hashtag's top posts don't change by the minute.
const CACHE_SECONDS = 6 * 3600;

async function topFor(store: Awaited<ReturnType<typeof storeOr503>>, tag: string, fresh: boolean) {
  if (store instanceof Response) throw new Error("no store");
  const key = `finder:ig:${tag}`;
  const cached = fresh ? null : await store.get(key);
  if (cached) return { posts: JSON.parse(cached) as InstagramPost[], cached: true };
  const posts = (await hashtagTopCarousels(tag)).slice(0, 24);
  await store.set(key, JSON.stringify(posts), { ex: CACHE_SECONDS });
  await store.set("status:finder", JSON.stringify({ ok: true, at: new Date().toISOString() }));
  return { posts, cached: false };
}

// POST { hashtag, fresh? }                → the hashtag's top carousels
// POST { hashtag, action: "trend" }       → Claude reads the top 4 at once: the
//                                           format that's winning + insights
export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;

  const body = ((await request.json().catch(() => ({}))) ?? {}) as { hashtag?: unknown; action?: unknown; fresh?: unknown };
  const tag = parseHashtag(String(body.hashtag ?? ""));
  if (!tag) return Response.json({ error: "bad_hashtag" }, { status: 400 });

  let found: { posts: InstagramPost[]; cached: boolean };
  try {
    found = await topFor(store, tag, body.fresh === true);
  } catch (err) {
    if (!(err instanceof InstagramError)) throw err;
    await store.set("status:finder", JSON.stringify({ ok: false, code: err.code, at: new Date().toISOString() }));
    const [error, status] = instagramFailure(err);
    return Response.json({ error }, { status });
  }

  if (body.action !== "trend") return Response.json({ hashtag: tag, ...found });

  const best = found.posts.slice(0, 4);
  const samples = (
    await Promise.all(
      best.map(async (post, i) => {
        const urls = post.images.length > 5 ? [...post.images.slice(0, 4), post.images[post.images.length - 1]] : post.images;
        const images = (await Promise.all(urls.map((u) => fetchImage(u, IMAGE_HOST_SUFFIXES)))).filter((x): x is Screenshot => Boolean(x));
        return { label: `Top post ${i + 1} in #${tag}: ${post.likes.toLocaleString("en-US")} likes, ${post.comments.toLocaleString("en-US")} comments`, caption: post.caption, images };
      }),
    )
  ).filter((s) => s.images.length > 0);
  if (samples.length === 0) return Response.json({ error: "creator_no_images" }, { status: 422 });

  const ip = clientIp(request);
  if (!(await takeAiCall(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }
  try {
    const { spec, insights, mock } = await analyzeCreator({
      platform: "instagram",
      username: `#${tag}`,
      stats: [
        `These are the top carousels in the hashtag #${tag} right now (Instagram's own "top" ranking), from different creators.`,
        "Describe the format most of them share, and what the winners have in common.",
      ],
      samples,
      postsRead: found.posts.length,
    });
    return Response.json({ spec: { ...spec, creator: insights }, mock });
  } catch (err) {
    await releaseAiCall(store, ip);
    if (err instanceof ClaudeError && err.code === "refused") return Response.json({ error: "refused" }, { status: 422 });
    console.error("trend analysis failed", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
