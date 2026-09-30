import { LIMITS } from "@/lib/config";
import { accountIdForToken } from "@/lib/credits";
import { bearerToken, objectsOr503, storeOr503 } from "@/lib/http";
import { addPhoto, listPhotos, withUrls } from "@/lib/photos";
import { currentTier } from "@/lib/plans";

async function context(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const objects = objectsOr503();
  if (objects instanceof Response) return objects;
  const accountId = await accountIdForToken(store, bearerToken(request));
  if (!accountId) return Response.json({ error: "no_account" }, { status: 401 });
  return { store, objects, accountId };
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (ctx instanceof Response) return ctx;
  return Response.json({ photos: await listPhotos(ctx.store, ctx.objects, ctx.accountId) });
}

function jpeg(value: FormDataEntryValue | null, max: number): value is File {
  return value instanceof Blob && value.type === "image/jpeg" && value.size > 0 && value.size <= max;
}

// One photo per request: the phone resizes it and makes the thumbnail first.
export async function POST(request: Request) {
  const ctx = await context(request);
  if (ctx instanceof Response) return ctx;
  const form = await request.formData().catch(() => null);
  const image = form?.get("image") ?? null;
  const thumb = form?.get("thumb") ?? null;
  if (!jpeg(image, LIMITS.maxPhotoBytes) || !jpeg(thumb, LIMITS.maxThumbBytes)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  let tags: unknown = [];
  try {
    tags = JSON.parse(String(form?.get("tags") ?? "[]"));
  } catch {
    tags = [];
  }
  const result = await addPhoto(ctx.store, ctx.objects, ctx.accountId, await currentTier(ctx.store, ctx.accountId), {
    image: new Uint8Array(await image.arrayBuffer()),
    thumb: new Uint8Array(await thumb.arrayBuffer()),
    takenAt: String(form?.get("takenAt") ?? ""),
    tags,
    w: Number(form?.get("w")),
    h: Number(form?.get("h")),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 402 });
  return Response.json({ photo: await withUrls(ctx.objects, ctx.accountId, result.photo) });
}
