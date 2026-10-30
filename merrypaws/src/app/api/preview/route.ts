import { LIMITS } from "@/lib/config";
import { freeForTesting, isOwner, releaseTestingCap, underTestingCap } from "@/lib/owner";
import { clearPortraitFailure, recordPortraitFailure } from "@/lib/health";
import { accountIdForToken, releaseFreeTrial, takeFreeTrial, takeMinuteSlot } from "@/lib/credits";
import { isValidDay, markDay } from "@/lib/daily";
import { track } from "@/lib/events";
import { bearerToken, guestOf, storeOr503 } from "@/lib/http";
import { isAlbumFull, refreshAllowance, releasePreview, takePreview, type PreviewSource } from "@/lib/plans";
import { savePortrait } from "@/lib/portraits";
import { getObjects } from "@/lib/objects";
import { generateImage } from "@/lib/stager";
import { buildPortraitPrompt, cleanIdea, cleanName, findCanvas, findStyle } from "@/lib/styles";
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
  // The painted portrait letters the name on; "your own scene" needs a scene.
  const extras = { name: cleanName(form?.get("name")), canvas: findCanvas(form?.get("canvas")).id, idea: cleanIdea(form?.get("idea")) ?? undefined };
  if (style.kind === "idea" && !extras.idea) return Response.json({ error: "bad_idea" }, { status: 400 });

  const accountId = await accountIdForToken(store, bearerToken(request));
  const guest = guestOf(request);
  const freeLimits = { perDevice: LIMITS.freePerDevice, perIp: LIMITS.freePerIpPerDay, global: LIMITS.freeGlobalPerDay };

  // Members spend their plan's previews, then pack previews. Anyone without
  // an allowance (guests, or members who ran out) gets the one free portrait
  // per device, if it's still unused.
  let source: PreviewSource | "free" | "owner" | null = null;
  if (accountId) {
    if (!(await takeMinuteSlot(store, accountId, LIMITS.previewsPerMinute))) {
      return Response.json({ error: "slow_down" }, { status: 429 });
    }
    await refreshAllowance(store, accountId);
    source = (await isOwner(store, accountId)) ? "owner" : await takePreview(store, accountId);
    if (source === "owner" && freeForTesting() && !(await underTestingCap(store))) {
      return Response.json({ error: "slow_down" }, { status: 429 });
    }
  }
  if (!source && (await takeFreeTrial(store, guest, freeLimits))) source = "free";
  if (!source) {
    await track(store, "guest_refused");
    return Response.json({ error: "limit_reached" }, { status: 429 });
  }

  try {
    const images = owner ? [pet, owner] : [pet];
    const full = await generateImage(images, buildPortraitPrompt(style, Boolean(owner), extras));
    const preview = await makePreview(full.bytes);
    const portrait = await savePortrait(store, getObjects(), full, style.id);
    await track(store, "generation_ok");
    await clearPortraitFailure(store);
    // A portrait keeps the daily roll going too.
    const day = form?.get("day");
    const daily =
      accountId && isValidDay(day) ? await markDay(store, accountId, day, { kind: "portrait" }, await isAlbumFull(store, accountId)) : null;
    return Response.json({
      id: portrait.id,
      style: style.id,
      preview: `data:image/jpeg;base64,${preview.toString("base64")}`,
      mock: full.mock,
      daily,
    });
  } catch (err) {
    // One line per failure with a reason, so the logs show what breaks.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "generation_failed", style: style.id, withOwner: Boolean(owner), reason, ideaLength: extras.idea?.length }));
    await track(store, "generation_failed");
    await recordPortraitFailure(store, reason);
    if (source === "free") await releaseFreeTrial(store, guest);
    else if (source === "owner") {
      if (freeForTesting()) await releaseTestingCap(store);
    } else if (accountId) await releasePreview(store, accountId, source);
    // A safety refusal is usually the owner's scene; say so, so they reword it.
    return Response.json({ error: reason.startsWith("refused") ? "refused" : "generation_failed" }, { status: 502 });
  }
}
