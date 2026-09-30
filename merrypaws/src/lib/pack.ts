import { randomInt } from "node:crypto";
import { addDays, getEntries, viewStreak } from "./daily";
import type { ObjectStore } from "./objects";
import { getPhoto, withUrls } from "./photos";
import type { Store } from "./store";

// The pack: friends who see each other's pet photo of the day and leave a
// paw. Deliberately finite, like BeReal: today's photos only, no endless feed.
// Albums stay private; only the daily photo is shared, and it can be hidden.

export const MAX_PACK = 50;
export const REACTIONS = ["paw", "heart", "laugh"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type PetProfile = { petName: string; kind: "dog" | "cat" | "other"; memorial: boolean };

// No 0/O/1/I, so codes survive being read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function setProfile(store: Store, accountId: string, input: Partial<Record<keyof PetProfile, unknown>>) {
  const kind = input.kind === "cat" || input.kind === "other" ? input.kind : "dog";
  const profile: PetProfile = {
    petName: typeof input.petName === "string" ? input.petName.replace(/\s+/g, " ").trim().slice(0, 24) : "",
    kind,
    memorial: input.memorial === true,
  };
  await store.set(`profile:${accountId}`, JSON.stringify(profile));
  return profile;
}

export async function getProfile(store: Store, accountId: string): Promise<PetProfile> {
  const raw = await store.get(`profile:${accountId}`);
  return raw ? (JSON.parse(raw) as PetProfile) : { petName: "", kind: "dog", memorial: false };
}

export async function inviteCode(store: Store, accountId: string) {
  const existing = await store.get(`invcode:${accountId}`);
  if (existing) return existing;
  for (;;) {
    const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (await store.set(`invite:${code}`, accountId, { nx: true })) {
      await store.set(`invcode:${accountId}`, code);
      return code;
    }
  }
}

export type JoinResult = "joined" | "already" | "self" | "unknown" | "full";

export async function joinPack(store: Store, accountId: string, code: string): Promise<JoinResult> {
  const friend = /^[A-Z2-9]{8}$/.test(code) ? await store.get(`invite:${code}`) : null;
  if (!friend) return "unknown";
  if (friend === accountId) return "self";
  if (await store.hget(`pack:${accountId}`, friend)) return "already";
  if ((await store.hlen(`pack:${accountId}`)) >= MAX_PACK || (await store.hlen(`pack:${friend}`)) >= MAX_PACK) return "full";
  const since = new Date().toISOString();
  await store.hset(`pack:${accountId}`, friend, since);
  await store.hset(`pack:${friend}`, accountId, since);
  return "joined";
}

export async function leavePack(store: Store, accountId: string, friend: string) {
  await store.hdel(`pack:${accountId}`, friend);
  await store.hdel(`pack:${friend}`, accountId);
}

export async function isFriend(store: Store, accountId: string, friend: string) {
  return friend === accountId || Boolean(await store.hget(`pack:${accountId}`, friend));
}

// Toggle a reaction on a friend's photo of the day.
export async function react(store: Store, accountId: string, friend: string, day: string, reaction: Reaction) {
  if (!(await isFriend(store, accountId, friend)) || friend === accountId) return false;
  const key = `react:${friend}:${day}`;
  const current = await store.hget(key, accountId);
  if (current === reaction) await store.hdel(key, accountId);
  else await store.hset(key, accountId, reaction);
  await store.expire(key, 30 * 24 * 60 * 60);
  return true;
}

async function reactionsFor(store: Store, owner: string, day: string, viewer: string) {
  const all = await store.hgetall(`react:${owner}:${day}`);
  const counts: Record<Reaction, number> = { paw: 0, heart: 0, laugh: 0 };
  for (const r of Object.values(all)) if (r in counts) counts[r as Reaction]++;
  return { counts, mine: (all[viewer] as Reaction | undefined) ?? null };
}

export type PackCard = {
  id: string;
  me: boolean;
  profile: PetProfile;
  streak: number;
  today: { thumb: string; full: string; caption: string; shared: boolean } | null;
  reactions: Awaited<ReturnType<typeof reactionsFor>>;
};

// Me first, then friends who posted today, then the rest.
export async function packFeed(store: Store, objects: ObjectStore, accountId: string, today: string): Promise<PackCard[]> {
  const ids = [accountId, ...Object.keys(await store.hgetall(`pack:${accountId}`))];
  const cards = await Promise.all(
    ids.map(async (id): Promise<PackCard> => {
      const profile = await getProfile(store, id);
      const entries = await getEntries(store, id);
      // Friends may be a timezone ahead or behind: accept their today or yesterday.
      const entry = entries[today] ?? (id === accountId ? undefined : entries[addDays(today, -1)]);
      let photo: PackCard["today"] = null;
      if (entry?.photoId && (entry.shared || id === accountId)) {
        const meta = await getPhoto(store, id, entry.photoId);
        if (meta) {
          const urls = await withUrls(objects, id, meta);
          photo = { thumb: urls.thumb, full: urls.full, caption: meta.caption, shared: entry.shared };
        }
      }
      return {
        id,
        me: id === accountId,
        profile,
        streak: profile.memorial ? 0 : await viewStreak(store, id, today),
        today: photo,
        reactions: await reactionsFor(store, id, entry && id !== accountId && !entries[today] ? addDays(today, -1) : today, accountId),
      };
    }),
  );
  const [me, ...friends] = cards;
  friends.sort((a, b) => Number(Boolean(b.today)) - Number(Boolean(a.today)) || b.streak - a.streak);
  return [me, ...friends];
}

export async function deleteSocial(store: Store, accountId: string) {
  for (const friend of Object.keys(await store.hgetall(`pack:${accountId}`))) await store.hdel(`pack:${friend}`, accountId);
  const code = await store.get(`invcode:${accountId}`);
  if (code) await store.del(`invite:${code}`);
  for (const key of ["pack", "profile", "invcode"]) await store.del(`${key}:${accountId}`);
}
