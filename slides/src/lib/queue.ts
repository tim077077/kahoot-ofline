import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { dataDir, ensureDir, readJson, writeAtomic } from "./local";

// The post queue: every finished carousel lands here, then leaves one of
// three ways, picked per post:
// - drafts:    the official TikTok Content Posting API puts it in your TikTok
//              inbox; you add a sound in the app and post (tiktok-official.ts)
// - extension: your SlideDrop Poster extension posts it from a logged-in
//              tiktok.com tab (extension/)
// - manual:    you download it and post by hand, then mark it posted
// Whichever way, it ends up in "My posts" with its numbers for the analyser.
//
// Stored as .data/posts/<id>/post.json plus slide-01.jpg … (JPEG works for
// both TikTok's API and the extension).

export type PostStatus = "ready" | "sending" | "in_drafts" | "posted" | "failed";
export type Channel = "drafts" | "extension" | "manual";

export type PostStats = { views: number; likes: number; comments: number; shares: number; saves: number; at: string };

export type QueuedPost = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  caption: string;
  format: string;
  slideTexts: string[];
  slideCount: number;
  status: PostStatus;
  channel?: Channel;
  // The extension's item id, or the official API's publish id.
  tiktokId?: string;
  link?: string;
  error?: string;
  postedAt?: string;
  stats?: PostStats;
};

const ID = /^p_[a-z0-9]{6,40}$/;
export const MAX_SLIDES = 35;

export const isPostId = (id: string) => ID.test(id);
const postsDir = () => path.join(dataDir(), "posts");
const postDir = (id: string) => {
  if (!isPostId(id)) throw new Error("bad post id");
  return path.join(postsDir(), id);
};
const slideName = (n: number) => `slide-${String(n).padStart(2, "0")}.jpg`;

export function slidePath(id: string, n: number) {
  return path.join(postDir(id), slideName(n));
}

export function newPostId() {
  return `p_${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function addPost(
  input: { title: string; caption: string; format: string; slideTexts: string[] },
  slides: Uint8Array[],
): QueuedPost {
  if (slides.length === 0 || slides.length > MAX_SLIDES) throw new Error("bad slide count");
  const id = newPostId();
  const now = new Date().toISOString();
  const post: QueuedPost = {
    id,
    createdAt: now,
    updatedAt: now,
    // TikTok caps photo titles at 90 characters.
    title: [...input.title.trim()].slice(0, 90).join(""),
    caption: input.caption.slice(0, 4000),
    format: input.format.slice(0, 80),
    slideTexts: input.slideTexts.slice(0, MAX_SLIDES).map((t) => t.slice(0, 500)),
    slideCount: slides.length,
    status: "ready",
  };
  ensureDir(postDir(id));
  slides.forEach((bytes, i) => writeAtomic(slidePath(id, i + 1), bytes));
  writeAtomic(path.join(postDir(id), "post.json"), JSON.stringify(post, null, 2));
  return post;
}

export function getPost(id: string): QueuedPost | null {
  if (!isPostId(id)) return null;
  return readJson<QueuedPost | null>(path.join(postDir(id), "post.json"), null);
}

export function listPosts(): QueuedPost[] {
  let ids: string[] = [];
  try {
    ids = readdirSync(postsDir()).filter(isPostId);
  } catch {
    return [];
  }
  return ids
    .map(getPost)
    .filter((p): p is QueuedPost => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updatePost(id: string, patch: Partial<Omit<QueuedPost, "id" | "createdAt">>): QueuedPost | null {
  const post = getPost(id);
  if (!post) return null;
  const next: QueuedPost = { ...post, ...patch, updatedAt: new Date().toISOString() };
  if (patch.status === "posted" && !post.postedAt) next.postedAt = next.updatedAt;
  if (patch.status && patch.status !== "failed") delete next.error;
  writeAtomic(path.join(postDir(id), "post.json"), JSON.stringify(next, null, 2));
  return next;
}

export function deletePost(id: string) {
  if (!isPostId(id)) return;
  rmSync(postDir(id), { recursive: true, force: true });
}

export function readSlide(id: string, n: number): Buffer | null {
  if (!Number.isInteger(n) || n < 1 || n > MAX_SLIDES) return null;
  try {
    return readFileSync(slidePath(id, n));
  } catch {
    return null;
  }
}

export function parseStats(input: unknown): PostStats | null {
  const s = input as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return null;
  const n = (v: unknown) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) && x >= 0 && x < 1e10 ? x : 0;
  };
  return { views: n(s.views), likes: n(s.likes), comments: n(s.comments), shares: n(s.shares), saves: n(s.saves), at: new Date().toISOString() };
}
