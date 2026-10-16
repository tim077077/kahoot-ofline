import { namedS, serverT } from "@/i18n/server";
import type { NativeSender } from "./fcm";
import { getProfile, type Reaction } from "./pack";
import type { Store } from "./store";

// The apps' push tokens, and the one thing they're used for so far: telling
// someone a friend reacted to their photo of the day. A friend's paw is the
// best reason to open the app that isn't a nag, so it's the only push besides
// the daily reminder (which the phone schedules itself). See PSYCHOLOGY.md.

export type Platform = "android" | "ios";
const MAX_DEVICES = 5;
const key = (accountId: string) => `fcm:${accountId}`;

export async function saveDeviceToken(store: Store, accountId: string, token: string, platform: Platform) {
  const all = await store.hgetall(key(accountId));
  // Keep the newest few phones; old tokens die on their own when FCM says so.
  const others = Object.entries(all).filter(([t]) => t !== token);
  if (others.length >= MAX_DEVICES) {
    others.sort((a, b) => (JSON.parse(a[1]) as { at: number }).at - (JSON.parse(b[1]) as { at: number }).at);
    for (const [old] of others.slice(0, others.length - MAX_DEVICES + 1)) await store.hdel(key(accountId), old);
  }
  await store.hset(key(accountId), token, JSON.stringify({ platform, at: Date.now() }));
}

export async function removeDeviceToken(store: Store, accountId: string, token?: string) {
  if (token) await store.hdel(key(accountId), token);
  else await store.del(key(accountId));
}

export async function deviceTokens(store: Store, accountId: string) {
  return Object.keys(await store.hgetall(key(accountId)));
}

const EMOJI: Record<Reaction, string> = { paw: "🐾", heart: "❤️", laugh: "😂" };
// However many friends tap, one push per friend per photo, and a ceiling a day.
const MAX_PER_DAY = 10;

export async function notifyReaction(store: Store, send: NativeSender | null, from: string, to: string, day: string, reaction: Reaction) {
  if (!send) return 0;
  const tokens = await deviceTokens(store, to);
  if (!tokens.length) return 0;
  // Un-react and react again doesn't buzz twice.
  if (!(await store.set(`reactpush:${to}:${day}:${from}`, "1", { ex: 3 * 24 * 3600, nx: true }))) return 0;
  const count = await store.incrby(`reactpushes:${to}:${day}`, 1);
  await store.expire(`reactpushes:${to}:${day}`, 2 * 24 * 3600);
  if (count > MAX_PER_DAY) return 0;

  const [owner, friend] = await Promise.all([getProfile(store, to), getProfile(store, from)]);
  const t = await serverT(owner.locale);
  const message = {
    title: t("push.reactionTitle", { emoji: EMOJI[reaction], friend: friend.petName.trim() || t("common.aFriendsPet") }),
    body: namedS(t, "push.reactionBody", owner.petName),
    data: { tab: "pack" },
    collapseKey: `react-${day}`,
  };
  let sent = 0;
  for (const token of tokens) {
    try {
      if ((await send(token, message)) === "gone") await removeDeviceToken(store, to, token);
      else sent++;
    } catch (err) {
      console.error("reaction push failed", err);
    }
  }
  return sent;
}
