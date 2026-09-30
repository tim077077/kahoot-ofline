"use client";

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

export type Profile = { petName: string; favorite: StyleId; onboarded: boolean };

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
