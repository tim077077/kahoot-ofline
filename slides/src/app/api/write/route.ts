import { LIMITS, PRO } from "@/lib/config";
import { accountIdForToken, releaseFreeTrial, releaseProWrite, takeFreeTrial, takeProWrite } from "@/lib/credits";
import { bearerToken, clientIp, storeOr503 } from "@/lib/http";
import { isPro } from "@/lib/pro";
import { findTemplate } from "@/lib/templates";
import { writeSlideshow, WriterError } from "@/lib/writer";

export const maxDuration = 60;

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const body = (await request.json().catch(() => ({}))) as {
    templateId?: string;
    topic?: string;
    promote?: string;
    slideCount?: number;
  };
  const template = findTemplate(body.templateId);
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, LIMITS.maxTopicChars) : "";
  const promote = typeof body.promote === "string" ? body.promote.trim().slice(0, LIMITS.maxTopicChars) : "";
  const slideCount = Math.min(LIMITS.maxSlides, Math.max(3, Math.round(Number(body.slideCount) || template?.slides || 6)));
  if (!template || !topic) return Response.json({ error: "bad_request" }, { status: 400 });

  const accountId = await accountIdForToken(store, bearerToken(request));
  const pro = await isPro(store, accountId);
  const ip = clientIp(request);
  const allowed = pro
    ? await takeProWrite(store, accountId!, PRO.aiPerDay)
    : await takeFreeTrial(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay });
  if (!allowed) return Response.json({ error: "limit_reached" }, { status: 429 });

  try {
    const { slideshow, mock } = await writeSlideshow({ template, topic, promote: promote || undefined, slideCount });
    return Response.json({ ...slideshow, mock });
  } catch (err) {
    if (pro) await releaseProWrite(store, accountId!);
    else await releaseFreeTrial(store, ip);
    if (err instanceof WriterError && err.code === "refused") {
      return Response.json({ error: "refused" }, { status: 422 });
    }
    console.error("write failed", err);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
