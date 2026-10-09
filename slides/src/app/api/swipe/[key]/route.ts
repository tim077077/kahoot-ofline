import { forbidCrossSite } from "@/lib/http";
import { readSwipeCover, removeSwipe } from "@/lib/swipe";

// GET: the saved cover image. DELETE: drop it from the swipe file.
export async function GET(_: Request, ctx: RouteContext<"/api/swipe/[key]">) {
  const bytes = readSwipeCover((await ctx.params).key);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" } });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/swipe/[key]">) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  removeSwipe((await ctx.params).key);
  return Response.json({ ok: true });
}
