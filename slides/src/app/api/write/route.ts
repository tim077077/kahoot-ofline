import { ClaudeError } from "@/lib/claude";
import { LIMITS } from "@/lib/config";
import { releaseAiCall, takeAiCall } from "@/lib/limits";
import { clientIp, storeOr503 } from "@/lib/http";
import { writeSlideshow } from "@/lib/writer";

export const maxDuration = 60;

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    formula?: unknown;
    exampleSlides?: unknown;
    topic?: unknown;
    promote?: unknown;
    slideCount?: unknown;
  };
  // The format comes from the client (curated or copied from screenshots), so
  // bound every field before it reaches the prompt.
  const name = clip(body.name, 80);
  const formula = clip(body.formula, 1500);
  const exampleSlides = Array.isArray(body.exampleSlides)
    ? body.exampleSlides.slice(0, LIMITS.maxSlides).map((s) => clip(s, 300)).filter(Boolean)
    : [];
  const topic = clip(body.topic, LIMITS.maxTopicChars);
  const promote = clip(body.promote, LIMITS.maxTopicChars);
  const slideCount = Math.min(LIMITS.maxSlides, Math.max(3, Math.round(Number(body.slideCount)) || exampleSlides.length || 6));
  if (!name || !formula || !topic) return Response.json({ error: "bad_request" }, { status: 400 });

  const ip = clientIp(request);
  if (!(await takeAiCall(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }

  try {
    const { slideshow, mock } = await writeSlideshow({
      name,
      formula,
      exampleSlides,
      topic,
      promote: promote || undefined,
      slideCount,
    });
    return Response.json({ ...slideshow, mock });
  } catch (err) {
    await releaseAiCall(store, ip);
    if (err instanceof ClaudeError && err.code === "refused") return Response.json({ error: "refused" }, { status: 422 });
    console.error("write failed", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
