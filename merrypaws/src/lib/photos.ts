import { randomUUID } from "node:crypto";
import { normalizeTags } from "./activities";
import { TIERS, type Tier } from "./config";
import type { ObjectStore } from "./objects";
import type { Store } from "./store";

// The album: one hash per account (photo id -> metadata) plus two files per
// photo in object storage, a phone-sized image and a thumbnail.

export type PhotoMeta = {
  id: string;
  // When it was taken (from the photo itself when the phone could read it).
  takenAt: string;
  addedAt: string;
  tags: string[];
  caption: string;
  favorite: boolean;
  w: number;
  h: number;
};

export type PhotoWithUrls = PhotoMeta & { thumb: string; full: string };

const URL_TTL = 24 * 60 * 60;
const key = (accountId: string) => `photos:${accountId}`;
const fileKey = (accountId: string, id: string, size: "full" | "thumb") =>
  `photos/${accountId}/${id}${size === "thumb" ? "_t" : ""}.jpg`;

export async function photoCount(store: Store, accountId: string) {
  return store.hlen(key(accountId));
}

export type NewPhoto = { image: Uint8Array; thumb: Uint8Array; takenAt?: string; tags?: unknown; w: number; h: number };

export async function addPhoto(
  store: Store,
  objects: ObjectStore,
  accountId: string,
  tier: Tier,
  input: NewPhoto,
): Promise<{ ok: true; photo: PhotoMeta } | { ok: false; error: "photo_limit" }> {
  if ((await photoCount(store, accountId)) >= TIERS[tier].photos) return { ok: false, error: "photo_limit" };
  const now = new Date().toISOString();
  const takenAt = input.takenAt && !Number.isNaN(Date.parse(input.takenAt)) ? new Date(input.takenAt).toISOString() : now;
  const photo: PhotoMeta = {
    id: randomUUID(),
    takenAt,
    addedAt: now,
    tags: normalizeTags(input.tags),
    caption: "",
    favorite: false,
    w: Math.round(input.w) || 0,
    h: Math.round(input.h) || 0,
  };
  await objects.put(fileKey(accountId, photo.id, "full"), input.image, "image/jpeg");
  await objects.put(fileKey(accountId, photo.id, "thumb"), input.thumb, "image/jpeg");
  await store.hset(key(accountId), photo.id, JSON.stringify(photo));
  return { ok: true, photo };
}

export async function withUrls(objects: ObjectStore, accountId: string, photo: PhotoMeta): Promise<PhotoWithUrls> {
  return {
    ...photo,
    thumb: await objects.url(fileKey(accountId, photo.id, "thumb"), URL_TTL),
    full: await objects.url(fileKey(accountId, photo.id, "full"), URL_TTL),
  };
}

// Newest first by the day it was taken.
export async function listPhotos(store: Store, objects: ObjectStore, accountId: string): Promise<PhotoWithUrls[]> {
  const all = Object.values(await store.hgetall(key(accountId))).map((raw) => JSON.parse(raw) as PhotoMeta);
  all.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  return Promise.all(all.map((p) => withUrls(objects, accountId, p)));
}

export async function getPhoto(store: Store, accountId: string, id: string) {
  const raw = await store.hget(key(accountId), id);
  return raw ? (JSON.parse(raw) as PhotoMeta) : null;
}

export async function updatePhoto(
  store: Store,
  objects: ObjectStore,
  accountId: string,
  id: string,
  patch: { tags?: unknown; caption?: unknown; favorite?: unknown; takenAt?: unknown },
) {
  const photo = await getPhoto(store, accountId, id);
  if (!photo) return null;
  const next: PhotoMeta = {
    ...photo,
    ...(patch.tags !== undefined ? { tags: normalizeTags(patch.tags) } : {}),
    ...(typeof patch.caption === "string" ? { caption: patch.caption.replace(/\s+/g, " ").trim().slice(0, 80) } : {}),
    ...(typeof patch.favorite === "boolean" ? { favorite: patch.favorite } : {}),
    ...(typeof patch.takenAt === "string" && !Number.isNaN(Date.parse(patch.takenAt))
      ? { takenAt: new Date(patch.takenAt).toISOString() }
      : {}),
  };
  await store.hset(key(accountId), id, JSON.stringify(next));
  return withUrls(objects, accountId, next);
}

export async function deletePhoto(store: Store, objects: ObjectStore, accountId: string, id: string) {
  if (!(await getPhoto(store, accountId, id))) return false;
  await objects.del(fileKey(accountId, id, "full"));
  await objects.del(fileKey(accountId, id, "thumb"));
  await store.hdel(key(accountId), id);
  return true;
}

export async function deleteAllPhotos(store: Store, objects: ObjectStore, accountId: string) {
  const ids = Object.keys(await store.hgetall(key(accountId)));
  for (const id of ids) {
    await objects.del(fileKey(accountId, id, "full"));
    await objects.del(fileKey(accountId, id, "thumb"));
  }
  await store.del(key(accountId));
  return ids.length;
}
