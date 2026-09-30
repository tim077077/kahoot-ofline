import { LIMITS } from "@/lib/config";
import { accountIdForToken, releaseFreeTrial, takeFreeTrial, takeMinuteSlot } from "@/lib/credits";
import { isValidDay, markDay } from "@/lib/daily";
import { track } from "@/lib/events";
import { bearerToken, guestOf, storeOr503 } from "@/lib/http";
import { isAlbumFull, refreshAllowance, releasePreview, takePreview, type PreviewSource } from "@/lib/plans";
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
  const guest = guestOf(request);
  const freeLimits = { perDevice: LIMITS.freePerDevice, perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay };

  // Members spend their plan's previews, then pack previews. Anyone without
  // an allowance (guests, or members who ran out) gets the one free portrait
  // per device, if it's still unused.
  let source: PreviewSource | "free" | null = null;
  if (accountId) {
    if (!(await takeMinuteSlot(store, accountId, LIMITS.previewsPerMinute))) {
      return Response.json({ error: "slow_down" }, { status: 429 });
    }
    await refreshAllowance(store, accountId);
    source = await takePreview(store, accountId);
  }
  if (!source && (await takeFreeTrial(store, guest, freeLimits))) source = "free";
  if (!source) {
    await track(store, "guest_refused");
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }

  try {
    const images = owner ? [pet, owner] : [pet];
    const { url, mock } = await generateImage(images, buildPortraitPrompt(style, Boolean(owner)));
    const preview = await makePreview(await fetchImageBytes(url));
    const portrait = await savePortrait(store, url, style.id);
    await track(store, "generation_ok");
    // A portrait keeps the daily roll going too.
    const day = form?.get("day");
    const daily =
      accountId && isValidDay(day) ? await markDay(store, accountId, day, { kind: "portrait" }, await isAlbumFull(store, accountId)) : null;
    return Response.json({
      id: portrait.id,
      style: style.id,
      preview: `data:image/jpeg;base64,${preview.toString("base64")}`,
      mock,
      daily,
    });
  } catch (err) {
    // One line per failure with a reason, so the logs show what breaks.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "generation_failed", style: style.id, withOwner: Boolean(owner), reason }));
    await track(store, "generation_failed");
    if (source === "free") await releaseFreeTrial(store, guest);
    else if (accountId) await releasePreview(store, accountId, source);
    return Response.json({ error: "generation_failed" }, { status: 502 });
  }
}
