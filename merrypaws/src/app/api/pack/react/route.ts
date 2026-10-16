import { after } from "next/server";
import { isValidDay } from "@/lib/daily";
import { fcmSender } from "@/lib/fcm";
import { memberOr401 } from "@/lib/http";
import { notifyReaction } from "@/lib/nativePush";
import { react, REACTIONS, type Reaction } from "@/lib/pack";

// A paw, a heart or a laugh on a friend's photo of the day (tap again to undo).
export async function POST(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { friend, day, reaction } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof friend !== "string" || !isValidDay(day) || !REACTIONS.includes(reaction as Reaction)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const result = await react(ctx.store, ctx.accountId, friend, day, reaction as Reaction);
  if (!result) return Response.json({ error: "not_in_pack" }, { status: 403 });
  // Tell the friend's phone after answering, so the tap feels instant.
  if (result === "added") {
    const { store, accountId } = ctx;
    after(() => notifyReaction(store, fcmSender(store), accountId, friend, day, reaction as Reaction).catch((err) => console.error("reaction push", err)));
  }
  return new Response(null, { status: 204 });
}
