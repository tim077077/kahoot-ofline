import type { Store } from "./store";

// Funnel counters, one per event per day. Enough to see where people drop off
// without shipping a third-party analytics SDK (and its privacy label).

export const CLIENT_EVENTS = [
  "intro_seen",
  "photo_step",
  "photo_rejected",
  "photo_used_anyway",
  "style_step",
  "reveal_seen",
  "paywall_shown",
  "paywall_dismissed",
  "share",
  "report",
] as const;

export const SERVER_EVENTS = ["generation_ok", "generation_failed", "guest_refused", "purchase"] as const;

export type EventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number];

export const ALL_EVENTS: readonly EventName[] = [...CLIENT_EVENTS, ...SERVER_EVENTS];

const KEEP_DAYS = 90;

const dayOf = (date: Date) => date.toISOString().slice(0, 10);

export function isClientEvent(name: unknown): name is (typeof CLIENT_EVENTS)[number] {
  return typeof name === "string" && (CLIENT_EVENTS as readonly string[]).includes(name);
}

// Never throws: analytics must not break the thing it measures.
export async function track(store: Store, name: EventName, now = new Date()) {
  try {
    const key = `ev:${dayOf(now)}:${name}`;
    if ((await store.incrby(key, 1)) === 1) await store.expire(key, KEEP_DAYS * 24 * 60 * 60);
  } catch (err) {
    console.error("track failed", name, err);
  }
}

// Counts for the last `days` days, newest first.
export async function readStats(store: Store, days: number, now = new Date()) {
  const out: { day: string; counts: Partial<Record<EventName, number>> }[] = [];
  for (let i = 0; i < days; i++) {
    const day = dayOf(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    const counts: Partial<Record<EventName, number>> = {};
    for (const name of ALL_EVENTS) {
      const value = Number((await store.get(`ev:${day}:${name}`)) ?? 0);
      if (value) counts[name] = value;
    }
    out.push({ day, counts });
  }
  return out;
}
