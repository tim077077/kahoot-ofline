"use client";

import type { Tier } from "./config";
import { readExifDate } from "./exif";
import type { LookId } from "./looks";
import type { StyleId } from "./styles";

// Client-side state that lives on the device: the access token, the pet's
// details from onboarding, and the reel of portraits made on this phone.

// Empty on the web (same origin). The mobile app build points this at the
// deployed backend, e.g. https://your-app.vercel.app
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");

const TOKEN_KEY = "pp_token";
const DEVICE_KEY = "pp_device";
const PROFILE_KEY = "pp_profile";
const REEL_KEY = "pp_reel";
const MAX_REEL = 40;

export type PetKind = "dog" | "cat" | "other";
export type Profile = {
  petName: string;
  kind?: PetKind;
  favorite: StyleId;
  onboarded: boolean;
  look?: LookId;
  // An album for a pet who has passed: no streaks, gentler words.
  memorial?: boolean;
};

export type DayCell = { day: string; state: "done" | "frozen" | "paused" | "empty" };
export type Daily = {
  count: number;
  best: number;
  doneToday: boolean;
  paused: boolean;
  freezes: number;
  outcome: "none" | "paused" | "frozen" | "broken";
  days: DayCell[];
  dailyPhotoIds: string[];
  todayEntry: { kind: "photo" | "portrait"; photoId?: string; shared: boolean } | null;
};
export type DailyResult = { count: number; best: number; milestone: number | null; newDay: boolean } | null;

export type Reaction = "paw" | "heart" | "laugh";
export type PackCard = {
  id: string;
  me: boolean;
  profile: { petName: string; kind: PetKind; memorial: boolean };
  streak: number;
  today: { thumb: string; full: string; caption: string; shared: boolean } | null;
  reactions: { counts: Record<Reaction, number>; mine: Reaction | null };
};

// What the server says about this member.
export type Account = {
  account: boolean;
  tier: Tier;
  renewsUntil?: string | null;
  interval?: "month" | "year" | null;
  credits: number;
  previews: number;
  photos: number;
  photoLimit: number;
  freeLeft: number;
  // The verified backup email, once the album can be opened on a new phone.
  email?: string | null;
};

export type Photo = {
  id: string;
  takenAt: string;
  addedAt: string;
  tags: string[];
  caption: string;
  favorite: boolean;
  w: number;
  h: number;
  thumb: string;
  full: string;
};

export type Portrait = {
  id: string;
  style: StyleId;
  preview: string;
  petName: string;
  withOwner: boolean;
  createdAt: string;
  unlocked: boolean;
  starred: boolean;
  // Made "in loving memory": gentler copy everywhere it appears.
  memorial?: boolean;
  mock?: boolean;
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the app keeps working for this session.
  }
}

function deviceId(): string {
  let id = read<string | null>(DEVICE_KEY, null);
  if (!id) {
    id = crypto.randomUUID();
    write(DEVICE_KEY, id);
  }
  return id;
}

export const storage = {
  token: () => read<string | null>(TOKEN_KEY, null),
  setToken: (token: string | null) => write(TOKEN_KEY, token),
  profile: () => read<Profile | null>(PROFILE_KEY, null),
  setProfile: (profile: Profile) => write(PROFILE_KEY, profile),
  reel: () => read<Portrait[]>(REEL_KEY, []),
  // Newest first; the oldest previews fall off so storage stays small.
  setReel: (reel: Portrait[]) => write(REEL_KEY, reel.slice(0, MAX_REEL)),
  // "Delete my data": everything except the device id, which keeps the free
  // portrait from resetting.
  clear: () => [TOKEN_KEY, PROFILE_KEY, REEL_KEY].forEach((k) => write(k, null)),
};

export function api(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Device", deviceId());
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export type UploadPhase = { kind: "loading"; progress: number } | { kind: "developing" };

// The preview request, over XHR so the loader can show real upload progress
// instead of a fake bar.
export function postPreview(form: FormData, token: string | null, onPhase: (p: UploadPhase) => void) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/preview`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Device", deviceId());
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onPhase({ kind: "loading", progress: e.loaded / e.total });
    };
    xhr.upload.onload = () => onPhase({ kind: "developing" });
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        // Non-JSON error page: handled by status.
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

// Funnel events. Fire and forget; never blocks or breaks the app.
export function track(name: string) {
  void api("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }), keepalive: true }).catch(() => {});
}

export function downloadUrl(id: string) {
  return `${API_BASE}/api/download/${id}`;
}

export const starName = (name: string) => name.trim() || "Your pet";

// The phone resizes every album photo before upload: a 2048px print and a
// 480px thumbnail. Fast on mobile data, and cheap to store.
export async function preparePhoto(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const taken = readExifDate(bytes) ?? (file.lastModified ? new Date(file.lastModified) : new Date());
  const bitmap = await createImageBitmap(file);
  const encode = async (edge: number, quality: number) => {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
    );
  };
  const image = await encode(2048, 0.85);
  const thumb = await encode(480, 0.78);
  const out = { image, thumb, w: bitmap.width, h: bitmap.height, takenAt: taken.toISOString() };
  bitmap.close();
  return out;
}

// The phone's own calendar day: streaks follow the member's midnight.
export function localDay(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function uploadPhoto(
  prepared: Awaited<ReturnType<typeof preparePhoto>>,
  tags: string[],
  token: string,
): Promise<{ photo?: Photo; error?: string; daily?: DailyResult }> {
  const form = new FormData();
  form.append("image", prepared.image, "photo.jpg");
  form.append("thumb", prepared.thumb, "thumb.jpg");
  form.append("takenAt", prepared.takenAt);
  form.append("w", String(prepared.w));
  form.append("h", String(prepared.h));
  form.append("tags", JSON.stringify(tags));
  form.append("day", localDay());
  const res = await api("/api/photos", { method: "POST", body: form }, token).catch(() => null);
  if (!res) return { error: "network" };
  const data = (await res.json().catch(() => ({}))) as { photo?: Photo; error?: string; daily?: DailyResult };
  return res.ok ? { photo: data.photo, daily: data.daily } : { error: data.error ?? "generic" };
}

export async function patchPhoto(id: string, patch: Partial<Pick<Photo, "tags" | "caption" | "favorite">>, token: string) {
  const res = await api(`/api/photos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }, token).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as { photo: Photo }).photo;
}

export async function removePhoto(id: string, token: string) {
  const res = await api(`/api/photos/${id}`, { method: "DELETE" }, token).catch(() => null);
  return Boolean(res?.ok);
}

// "'24 7 14": the orange date stamp of a 90s point-and-shoot.
export function dateStamp(iso: string) {
  const d = new Date(iso);
  return `'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`;
}

export function jsonApi(path: string, method: string, body: unknown, token: string | null) {
  return api(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, token);
}
