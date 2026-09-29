import { storeOr503 } from "@/lib/http";
import { getPortrait, isUnlocked } from "@/lib/portraits";

// Lets the page poll after checkout until the webhook has unlocked the portrait.
export async function GET(_request: Request, ctx: RouteContext<"/api/portrait/[id]">) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { id } = await ctx.params;
  const portrait = await getPortrait(store, id);
  if (!portrait) return Response.json({ error: "expired" }, { status: 404 });
  return Response.json({ id, style: portrait.style, unlocked: await isUnlocked(store, id) });
}
