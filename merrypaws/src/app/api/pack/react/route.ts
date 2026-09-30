import { isValidDay } from "@/lib/daily";
import { memberOr401 } from "@/lib/http";
import { react, REACTIONS, type Reaction } from "@/lib/pack";

// A paw, a heart or a laugh on a friend's photo of the day (tap again to undo).
export async function POST(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { friend, day, reaction } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof friend !== "string" || !isValidDay(day) || !REACTIONS.includes(reaction as Reaction)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!(await react(ctx.store, ctx.accountId, friend, day, reaction as Reaction))) {
    return Response.json({ error: "not_in_pack" }, { status: 403 });
  }
  return new Response(null, { status: 204 });
}
