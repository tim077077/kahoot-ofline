import { promptFor } from "./dailyPrompts";
import { getProfile } from "./pack";
import type { Store } from "./store";

// The daily reminder: one web push a day, at an hour the member picks, only
// if today's photo isn't in yet. Never for memorial albums, never twice a day,
// never guilt ("Luna misses you"). See PSYCHOLOGY.md.
//
// Subscriptions sit in 24 buckets by UTC hour so the hourly cron only reads
// the people due now. The phone re-sends its subscription every time the app
// opens, which re-buckets it after a clock change or a trip abroad.

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };
export type Reminder = { sub: PushSubscriptionJSON; hour: number; tz: string; bucket: number };

export function validSubscription(input: unknown): input is PushSubscriptionJSON {
  const s = input as PushSubscriptionJSON | null;
  return (
    typeof s?.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length < 1024 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string" &&
    s.keys.p256dh.length < 256 &&
    s.keys.auth.length < 64
  );
}

export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// The wall clock in a time zone: its calendar day and hour.
export function localClock(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Which UTC hour a local hour falls on today in that zone.
export function utcBucket(hour: number, tz: string, now = new Date()) {
  const offset = (localClock(tz, now).hour - now.getUTCHours() + 24) % 24;
  return (hour - offset + 24) % 24;
}

export async function saveReminder(store: Store, accountId: string, sub: PushSubscriptionJSON, hour: number, tz: string) {
  const previous = await getReminder(store, accountId);
  const bucket = utcBucket(hour, tz);
  if (previous && previous.bucket !== bucket) await store.hdel(`pushq:${previous.bucket}`, accountId);
  const reminder: Reminder = { sub, hour, tz, bucket };
  await store.set(`push:${accountId}`, JSON.stringify(reminder));
  await store.hset(`pushq:${bucket}`, accountId, "1");
  return reminder;
}

export async function getReminder(store: Store, accountId: string): Promise<Reminder | null> {
  const raw = await store.get(`push:${accountId}`);
  return raw ? (JSON.parse(raw) as Reminder) : null;
}

export async function removeReminder(store: Store, accountId: string) {
  const previous = await getReminder(store, accountId);
  if (previous) await store.hdel(`pushq:${previous.bucket}`, accountId);
  await store.del(`push:${accountId}`);
}

export type Notice = { title: string; body: string; url: string };

export async function reminderNotice(store: Store, accountId: string, day: string): Promise<Notice> {
  const { petName } = await getProfile(store, accountId);
  return {
    title: petName ? `${petName}'s photo of the day` : "Photo of the day",
    body: `Today: ${promptFor(day).toLowerCase()}`,
    url: "/",
  };
}

export type Sender = (sub: PushSubscriptionJSON, notice: Notice) => Promise<"sent" | "gone">;

// One cron tick: remind everyone due this hour who hasn't added today's photo.
export async function sendDue(store: Store, send: Sender, now = new Date()) {
  const bucket = now.getUTCHours();
  const due = Object.keys(await store.hgetall(`pushq:${bucket}`));
  const tally = { due: due.length, sent: 0, skipped: 0, removed: 0 };
  for (const accountId of due) {
    const reminder = await getReminder(store, accountId);
    if (!reminder) {
      await store.hdel(`pushq:${bucket}`, accountId);
      tally.skipped++;
      continue;
    }
    const clock = localClock(reminder.tz, now);
    // A clock change since the phone last synced: wait for the right hour.
    const onTime = Math.abs(clock.hour - reminder.hour) <= 1 || Math.abs(clock.hour - reminder.hour) === 23;
    const done = await store.hget(`daily:${accountId}`, clock.day);
    const { memorial } = await getProfile(store, accountId);
    if (!onTime || done || memorial || !(await store.set(`pushsent:${accountId}:${clock.day}`, "1", { ex: 2 * 24 * 3600, nx: true }))) {
      tally.skipped++;
      continue;
    }
    try {
      if ((await send(reminder.sub, await reminderNotice(store, accountId, clock.day))) === "gone") {
        await removeReminder(store, accountId);
        tally.removed++;
      } else tally.sent++;
    } catch (err) {
      console.error("push failed", accountId, err);
      tally.skipped++;
    }
  }
  return tally;
}
