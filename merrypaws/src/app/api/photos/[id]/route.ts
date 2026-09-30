import { accountIdForToken } from "@/lib/credits";
import { bearerToken, objectsOr503, storeOr503 } from "@/lib/http";
import { deletePhoto, updatePhoto } from "@/lib/photos";

async function context(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const objects = objectsOr503();
  if (objects instanceof Response) return objects;
  const accountId = await accountIdForToken(store, bearerToken(request));
  if (!accountId) return Response.json({ error: "no_account" }, { status: 401 });
  return { store, objects, accountId };
}

// Tags ("what were they up to"), caption, favourite, or the date.
export async function PATCH(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const ctx = await context(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  const patch = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const photo = await updatePhoto(ctx.store, ctx.objects, ctx.accountId, id, patch);
  if (!photo) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ photo });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/photos/[id]">) {
  const ctx = await context(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!(await deletePhoto(ctx.store, ctx.objects, ctx.accountId, id))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
