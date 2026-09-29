import { analyzeScreenshots, type Screenshot } from "@/lib/analyze";
import { ClaudeError } from "@/lib/claude";
import { LIMITS } from "@/lib/config";
import { releaseAiCall, takeAiCall } from "@/lib/limits";
import { clientIp, storeOr503 } from "@/lib/http";
import { fetchTikTokPost, parseTikTokUrl, TikTokLinkError, type TikTokPost } from "@/lib/tiktok";

export const maxDuration = 90;

const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 4 * 1024 * 1024;

// Accepts screenshots, a TikTok link, or both. The link contributes the
// post's cover (usually the hook) and caption; screenshots add the rest.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const form = await request.formData().catch(() => null);
  const files = (form?.getAll("screenshot") ?? []).filter((f): f is File => f instanceof Blob);
  const link = String(form?.get("link") ?? "").trim();
  if ((files.length === 0 && !link) || files.length > LIMITS.maxSlides) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (files.some((f) => !TYPES.includes(f.type as (typeof TYPES)[number]) || f.size > MAX_BYTES)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (link && !parseTikTokUrl(link)) return Response.json({ error: "bad_link" }, { status: 400 });

  let post: TikTokPost | undefined;
  if (link) {
    try {
      post = await fetchTikTokPost(link);
    } catch (err) {
      if (err instanceof TikTokLinkError) return Response.json({ error: "link_unavailable" }, { status: 422 });
      throw err;
    }
    // Without a cover image there's nothing to read the look from.
    if (!post.cover && files.length === 0) return Response.json({ error: "link_no_cover" }, { status: 422 });
  }

  const ip = clientIp(request);
  if (!(await takeAiCall(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }

  try {
    const uploaded: Screenshot[] = await Promise.all(
      files.map(async (f) => ({
        data: Buffer.from(await f.arrayBuffer()).toString("base64"),
        mediaType: f.type as Screenshot["mediaType"],
      })),
    );
    const shots = post?.cover ? [post.cover, ...uploaded].slice(0, LIMITS.maxSlides) : uploaded;
    const { spec, mock } = await analyzeScreenshots(shots, { caption: post?.caption, coverFirst: Boolean(post?.cover) });
    return Response.json({ spec, mock, fromLink: post ? { author: post.author, caption: post.caption, cover: Boolean(post.cover) } : null });
  } catch (err) {
    await releaseAiCall(store, ip);
    if (err instanceof ClaudeError && err.code === "refused") return Response.json({ error: "refused" }, { status: 422 });
    console.error("analyze failed", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
