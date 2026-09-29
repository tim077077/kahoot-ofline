import { LIMITS } from "@/lib/config";
import {
  accountIdForToken,
  getCredits,
  refundCredit,
  releaseFreeTrial,
  takeCredit,
  takeFreeTrial,
} from "@/lib/credits";
import { bearerToken, clientIp } from "@/lib/http";
import { buildPrompt, parseOptions } from "@/lib/prompts";
import { stageImage } from "@/lib/stager";
import { getStore, StoreNotConfiguredError } from "@/lib/store";

// Image models usually answer in 10-30s; leave headroom.
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  let store;
  try {
    store = getStore();
  } catch (err) {
    if (err instanceof StoreNotConfiguredError) return Response.json({ error: "not_configured" }, { status: 503 });
    throw err;
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const options = parseOptions({ mode: form?.get("mode"), room: form?.get("room"), style: form?.get("style") });
  if (!(image instanceof Blob) || !options) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(image.type)) return Response.json({ error: "bad_type" }, { status: 400 });
  if (image.size > LIMITS.maxUploadBytes) return Response.json({ error: "too_large" }, { status: 413 });

  const accountId = await accountIdForToken(store, bearerToken(request));
  const ip = clientIp(request);

  if (accountId) {
    if (!(await takeCredit(store, accountId))) return Response.json({ error: "no_credits" }, { status: 402 });
  } else if (!(await takeFreeTrial(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay }))) {
    return Response.json({ error: "free_used" }, { status: 402 });
  }

  try {
    const prompt = buildPrompt(options.mode, options.room, options.style);
    const { url, mock } = await stageImage(image, prompt);
    const credits = accountId ? await getCredits(store, accountId) : undefined;
    return Response.json({ url, mock, credits });
  } catch (err) {
    console.error("staging failed", err);
    // The user shouldn't pay for our failure.
    if (accountId) await refundCredit(store, accountId);
    else await releaseFreeTrial(store, ip);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
