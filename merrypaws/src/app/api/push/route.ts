import { memberOr401 } from "@/lib/http";
import { getReminder, removeReminder, saveReminder, validSubscription, validTimeZone } from "@/lib/push";
import { pushConfigured } from "@/lib/webpush";

// The daily reminder for this album: which hour, if any.
export async function GET(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const reminder = await getReminder(ctx.store, ctx.accountId);
  return Response.json({ configured: pushConfigured(), hour: reminder?.hour ?? null });
}

// Turn it on, or re-sync (the app sends this on every open).
export async function PUT(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  if (!pushConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { subscription?: unknown; hour?: unknown; tz?: unknown };
  const hour = Number(body.hour);
  if (!validSubscription(body.subscription) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !validTimeZone(body.tz)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const reminder = await saveReminder(ctx.store, ctx.accountId, body.subscription, hour, body.tz);
  return Response.json({ hour: reminder.hour });
}

export async function DELETE(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  await removeReminder(ctx.store, ctx.accountId);
  return Response.json({ hour: null });
}
