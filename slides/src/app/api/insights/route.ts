import { ClaudeError } from "@/lib/claude";
import { LIMITS } from "@/lib/config";
import { clientIp, forbidCrossSite, storeOr503 } from "@/lib/http";
import { releaseAiCall, takeAiCall } from "@/lib/limits";
import { analyzePerformance, measured, MIN_POSTS, summarize } from "@/lib/performance";
import { listPosts } from "@/lib/queue";

export const maxDuration = 90;
const REPORT_KEY = "insights:report";

// GET: the free numbers plus the last report. POST: run a new report.
export async function GET() {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const raw = await store.get(REPORT_KEY);
  return Response.json({ numbers: summarize(listPosts()), report: raw ? JSON.parse(raw) : null, minPosts: MIN_POSTS });
}

export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;

  const posts = listPosts();
  if (measured(posts).length < MIN_POSTS) return Response.json({ error: "not_enough_posts" }, { status: 400 });
  const ip = clientIp(request);
  if (!(await takeAiCall(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }
  try {
    const report = await analyzePerformance(posts);
    await store.set(REPORT_KEY, JSON.stringify(report));
    return Response.json({ numbers: summarize(posts), report });
  } catch (err) {
    await releaseAiCall(store, ip);
    if (err instanceof ClaudeError && err.code === "refused") return Response.json({ error: "refused" }, { status: 422 });
    console.error("performance report failed", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
