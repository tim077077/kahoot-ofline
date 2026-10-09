import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// SlideDrop runs on your own computer, so its data lives in a folder next to
// the app (slides/.data, git-ignored): the post queue, slide images, the
// swipe file and settings. SLIDEDROP_DATA_DIR moves it.

export function dataDir() {
  return process.env.SLIDEDROP_DATA_DIR || path.join(process.cwd(), ".data");
}

export function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Write a file so a crash mid-write never leaves half a file behind.
export function writeAtomic(file: string, data: string | Uint8Array) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
