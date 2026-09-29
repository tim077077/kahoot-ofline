import { LIMITS } from "@/lib/config";
import {
  accountIdForToken,
  releaseBuyerPreview,
  releaseFreeTrial,
  takeBuyerPreview,
  takeFreeTrial,
} from "@/lib/credits";
import { bearerToken, clientIp, storeOr503 } from "@/lib/http";
import { savePortrait } from "@/lib/portraits";
import { fetchImageBytes, generateImage } from "@/lib/stager";
import { buildPortraitPrompt, findStyle } from "@/lib/styles";
import { makePreview } from "@/lib/watermark";

// Image models usually answer in 10-30s; leave headroom.
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validImage(value: FormDataEntryValue | null | undefined): value is File {
  return value instanceof Blob && ALLOWED_TYPES.includes(value.type) && value.size <= LIMITS.maxUploadBytes;
}

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const form = await request.formData().catch(() => null);
  const pet = form?.get("pet");
  const owner = form?.get("owner");
  const style = findStyle(form?.get("style"));
  if (!style || !validImage(pet)) return Response.json({ error: "bad_request" }, { status: 400 });
  if (owner != null && !validImage(owner)) return Response.json({ error: "bad_request" }, { status: 400 });

  const accountId = await accountIdForToken(store, bearerToken(request));
  const ip = clientIp(request);
  const allowed = accountId
    ? await takeBuyerPreview(store, accountId, LIMITS.buyerPerDay)
    : await takeFreeTrial(store, ip, { perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay });
  if (!allowed) return Response.json({ error: "limit_reached" }, { status: 429 });

  try {
    const images = owner ? [pet, owner] : [pet];
    const { url, mock } = await generateImage(images, buildPortraitPrompt(style, Boolean(owner)));
    const preview = await makePreview(await fetchImageBytes(url));
    const portrait = await savePortrait(store, url, style.id);
    return Response.json({
      id: portrait.id,
      style: style.id,
      preview: `data:image/jpeg;base64,${preview.toString("base64")}`,
      mock,
    });
  } catch (err) {
    console.error("preview failed", err);
    if (accountId) await releaseBuyerPreview(store, accountId);
    else await releaseFreeTrial(store, ip);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
