"use client";

import type { StyleId } from "./styles";

// Client-side state that lives on the device: the access token, the pet's
// details from onboarding, and the reel of portraits made on this phone.

// Empty on the web (same origin). The mobile app build points this at the
// deployed backend, e.g. https://your-app.vercel.app
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");

const TOKEN_KEY = "pp_token";
const PROFILE_KEY = "pp_profile";
const REEL_KEY = "pp_reel";
const MAX_REEL = 40;

export type PetKind = "dog" | "cat" | "other";
export type Profile = { petName: string; kind: PetKind; favorite: StyleId; onboarded: boolean };

export type Portrait = {
  id: string;
  style: StyleId;
  preview: string;
  petName: string;
  withOwner: boolean;
  createdAt: string;
  unlocked: boolean;
  starred: boolean;
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

export const storage = {
  token: () => read<string | null>(TOKEN_KEY, null),
  setToken: (token: string | null) => write(TOKEN_KEY, token),
  profile: () => read<Profile | null>(PROFILE_KEY, null),
  setProfile: (profile: Profile) => write(PROFILE_KEY, profile),
  reel: () => read<Portrait[]>(REEL_KEY, []),
  // Newest first; the oldest previews fall off so storage stays small.
  setReel: (reel: Portrait[]) => write(REEL_KEY, reel.slice(0, MAX_REEL)),
};

export function api(path: string, init: RequestInit = {}, token?: string | null) {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export function downloadUrl(id: string) {
  return `${API_BASE}/api/download/${id}`;
}

export function filmTitle(p: { petName: string }, style: { title: string }) {
  return { star: (p.petName || "Your pet").toUpperCase(), film: style.title };
}
