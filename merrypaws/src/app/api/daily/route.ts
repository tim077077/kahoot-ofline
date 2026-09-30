import { freezesLeft, getEntries, grantFreezes, isValidDay, recentDays, setShared, settleStreak } from "@/lib/daily";
import { memberOr401 } from "@/lib/http";
import { currentTier, isAlbumFull } from "@/lib/plans";

// The daily roll: the streak (settled for today), freezes and the last two
// weeks as a film strip. ?day= is the phone's local date.
export async function GET(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const day = new URL(request.url).searchParams.get("day");
  if (!isValidDay(day)) return Response.json({ error: "bad_day" }, { status: 400 });
  const { store, accountId } = ctx;
  await grantFreezes(store, accountId, await currentTier(store, accountId), day);
  const albumFull = await isAlbumFull(store, accountId);
  const streak = await settleStreak(store, accountId, day, albumFull);
  const entries = await getEntries(store, accountId);
  return Response.json({
    count: streak.count,
    best: streak.best,
    doneToday: streak.last === day,
    todayEntry: entries[day] ?? null,
    outcome: streak.outcome,
    paused: albumFull,
    freezes: await freezesLeft(store, accountId),
    days: await recentDays(store, accountId, day, 14),
    // Photo ids that were someone's photo of the day: the "photo a day" highlight.
    dailyPhotoIds: Object.values(entries).flatMap((e) => (e.photoId ? [e.photoId] : [])),
  });
}

// Show or hide a day's photo from the pack.
export async function PATCH(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { day, shared } = (await request.json().catch(() => ({}))) as { day?: unknown; shared?: unknown };
  if (typeof day !== "string" || typeof shared !== "boolean") return Response.json({ error: "bad_request" }, { status: 400 });
  if (!(await setShared(ctx.store, ctx.accountId, day, shared))) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ shared });
}
