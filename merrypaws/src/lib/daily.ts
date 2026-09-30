import { TIERS, type Tier } from "./config";
import type { Store } from "./store";

// The daily roll: one photo (or portrait) a day, counted as a streak.
//
// Kind by design (see PSYCHOLOGY.md):
// - A missed day spends a streak freeze automatically if there is one.
// - While a free album is full, missed days are forgiven: the streak pauses,
//   it never breaks because someone didn't pay.
// - Memorial albums never show a streak (the app hides it).
// Days are the member's local calendar days (YYYY-MM-DD), sent by the phone
// and accepted only within a day of the server's own date.

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const MAX_FREEZES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyEntry = { kind: "photo" | "portrait"; photoId?: string; shared: boolean; at: string };
export type StreakState = { count: number; best: number; last: string | null };

export function isValidDay(day: unknown, now = Date.now()): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(t) && Math.abs(t - now) <= 1.6 * DAY_MS;
}

export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
}

async function readState(store: Store, accountId: string): Promise<StreakState> {
  const raw = await store.get(`streak:${accountId}`);
  return raw ? (JSON.parse(raw) as StreakState) : { count: 0, best: 0, last: null };
}

export async function freezesLeft(store: Store, accountId: string) {
  return Math.max(0, Number((await store.get(`freezes:${accountId}`)) ?? 0));
}

// This month's freezes, granted once per calendar month.
export async function grantFreezes(store: Store, accountId: string, tier: Tier, today: string) {
  const claimed = await store.set(`freezegrant:${accountId}:${today.slice(0, 7)}`, "1", { ex: 40 * 24 * 60 * 60, nx: true });
  if (!claimed) return;
  const total = await store.incrby(`freezes:${accountId}`, TIERS[tier].freezesPerMonth);
  if (total > MAX_FREEZES) await store.set(`freezes:${accountId}`, String(MAX_FREEZES));
}

// What happened to the days missed since the last one: forgiven (album
// full), frozen (freezes spent), or broken.
function settlePlan(state: StreakState, today: string, freezes: number, albumFull: boolean) {
  if (!state.last || state.count === 0) return { outcome: "none" as const, missed: [] as string[] };
  const gap = daysBetween(state.last, today) - 1;
  if (gap <= 0) return { outcome: "none" as const, missed: [] };
  const missed = Array.from({ length: gap }, (_, i) => addDays(state.last!, i + 1));
  if (albumFull) return { outcome: "paused" as const, missed };
  if (freezes >= gap) return { outcome: "frozen" as const, missed };
  return { outcome: "broken" as const, missed };
}

// Apply that decision, once. Returns the streak as of today.
export async function settleStreak(store: Store, accountId: string, today: string, albumFull: boolean) {
  const state = await readState(store, accountId);
  const plan = settlePlan(state, today, await freezesLeft(store, accountId), albumFull);
  if (plan.outcome === "none") return { ...state, outcome: plan.outcome };
  const next: StreakState = { ...state };
  if (plan.outcome === "broken") {
    next.count = 0;
  } else {
    if (plan.outcome === "frozen") await store.incrby(`freezes:${accountId}`, -plan.missed.length);
    for (const day of plan.missed) await store.hset(`frozen:${accountId}`, day, plan.outcome);
    next.last = addDays(today, -1);
  }
  await store.set(`streak:${accountId}`, JSON.stringify(next));
  return { ...next, outcome: plan.outcome };
}

// Read-only view for friends' cards: what their streak will be once settled.
export async function viewStreak(store: Store, accountId: string, today: string) {
  const state = await readState(store, accountId);
  const plan = settlePlan(state, today, await freezesLeft(store, accountId), false);
  return plan.outcome === "broken" ? 0 : state.count;
}

// Count today. The first entry of a day extends the streak; a later photo
// replaces a portrait-only entry so friends have something to see.
export async function markDay(
  store: Store,
  accountId: string,
  today: string,
  entry: { kind: "photo" | "portrait"; photoId?: string },
  albumFull: boolean,
) {
  const existing = await store.hget(`daily:${accountId}`, today);
  const previous = existing ? (JSON.parse(existing) as DailyEntry) : null;
  if (!previous || (!previous.photoId && entry.photoId)) {
    const value: DailyEntry = { ...entry, shared: previous?.shared ?? true, at: new Date().toISOString() };
    await store.hset(`daily:${accountId}`, today, JSON.stringify(value));
  }
  const state = await settleStreak(store, accountId, today, albumFull);
  if (state.last === today) return { count: state.count, best: state.best, milestone: null as number | null, newDay: false };
  const count = state.count + 1;
  const next: StreakState = { count, best: Math.max(state.best, count), last: today };
  await store.set(`streak:${accountId}`, JSON.stringify(next));
  return { count, best: next.best, milestone: MILESTONES.includes(count) ? count : null, newDay: true };
}

export async function getEntries(store: Store, accountId: string) {
  const raw = await store.hgetall(`daily:${accountId}`);
  return Object.fromEntries(Object.entries(raw).map(([day, v]) => [day, JSON.parse(v) as DailyEntry]));
}

export async function setShared(store: Store, accountId: string, day: string, shared: boolean) {
  const raw = await store.hget(`daily:${accountId}`, day);
  if (!raw) return false;
  await store.hset(`daily:${accountId}`, day, JSON.stringify({ ...(JSON.parse(raw) as DailyEntry), shared }));
  return true;
}

// The last `n` days as a film strip: done, frozen/paused, or empty.
export async function recentDays(store: Store, accountId: string, today: string, n = 14) {
  const entries = await getEntries(store, accountId);
  const frozen = await store.hgetall(`frozen:${accountId}`);
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1);
    return { day, state: entries[day] ? "done" : frozen[day] ? (frozen[day] as "frozen" | "paused") : "empty" };
  });
}

export async function deleteDaily(store: Store, accountId: string) {
  for (const key of ["daily", "streak", "frozen", "freezes"]) await store.del(`${key}:${accountId}`);
}
