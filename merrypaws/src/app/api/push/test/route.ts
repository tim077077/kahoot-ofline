import { memberOr401 } from "@/lib/http";
import { getReminder, localClock, reminderNotice } from "@/lib/push";
import { sendPush } from "@/lib/webpush";

// "Send one now", so the member sees what tomorrow's reminder looks like.
export async function POST(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const reminder = await getReminder(ctx.store, ctx.accountId);
  if (!reminder) return Response.json({ error: "no_reminder" }, { status: 404 });
  const n = await ctx.store.incrby(`pushtest:${ctx.accountId}`, 1);
  if (n === 1) await ctx.store.expire(`pushtest:${ctx.accountId}`, 3600);
  if (n > 3) return Response.json({ error: "slow_down" }, { status: 429 });
  const notice = await reminderNotice(ctx.store, ctx.accountId, localClock(reminder.tz).day);
  try {
    return Response.json({ result: await sendPush(reminder.sub, notice) });
  } catch (err) {
    console.error("test push failed", err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
