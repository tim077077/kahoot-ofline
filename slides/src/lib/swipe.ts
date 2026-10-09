import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { dataDir, readJson, writeAtomic } from "./local";
import { fetchTikTokPost } from "./tiktok";

// The swipe file: viral TikTok slideshows you've spotted while scrolling.
// TikTok has no official way to search or list other people's posts, so you
// find them (TikTok search, sorted by likes) and paste the link; this keeps
// the cover and caption so you can copy the format later.

export type SwipeItem = { key: string; link: string; author: string; caption: string; hasCover: boolean; addedAt: string; note?: string };

const file = () => path.join(dataDir(), "swipe.json");
const coverFile = (key: string) => path.join(dataDir(), "swipe", `${key}.jpg`);
const KEY = /^[a-f0-9]{16}$/;
const MAX_ITEMS = 300;

export const swipeKey = (link: string) => createHash("sha256").update(link.trim()).digest("hex").slice(0, 16);

export function listSwipe(): SwipeItem[] {
  return readJson<SwipeItem[]>(file(), []);
}

export async function addSwipe(link: string, note = ""): Promise<SwipeItem> {
  const key = swipeKey(link);
  const existing = listSwipe().find((i) => i.key === key);
  if (existing) return existing;
  const post = await fetchTikTokPost(link);
  if (post.cover) writeAtomic(coverFile(key), Buffer.from(post.cover.data, "base64"));
  const item: SwipeItem = {
    key,
    link: link.trim(),
    author: post.author,
    caption: post.caption.slice(0, 500),
    hasCover: Boolean(post.cover),
    addedAt: new Date().toISOString(),
    note: note.slice(0, 200) || undefined,
  };
  writeAtomic(file(), JSON.stringify([item, ...listSwipe()].slice(0, MAX_ITEMS), null, 2));
  return item;
}

export function removeSwipe(key: string) {
  if (!KEY.test(key)) return;
  writeAtomic(file(), JSON.stringify(listSwipe().filter((i) => i.key !== key), null, 2));
  rmSync(coverFile(key), { force: true });
}

export function readSwipeCover(key: string): Buffer | null {
  if (!KEY.test(key)) return null;
  try {
    return readFileSync(coverFile(key));
  } catch {
    return null;
  }
}
