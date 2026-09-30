import { isValidDay } from "@/lib/daily";
import { memberOr401, objectsOr503 } from "@/lib/http";
import { inviteCode, packFeed } from "@/lib/pack";

// Today in the pack: my card, then each friend's photo of the day.
export async function GET(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const objects = objectsOr503();
  if (objects instanceof Response) return objects;
  const day = new URL(request.url).searchParams.get("day");
  if (!isValidDay(day)) return Response.json({ error: "bad_day" }, { status: 400 });
  return Response.json({
    code: await inviteCode(ctx.store, ctx.accountId),
    cards: await packFeed(ctx.store, objects, ctx.accountId, day),
  });
}
