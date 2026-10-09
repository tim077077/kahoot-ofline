"use client";

import { loadJson, saveJson } from "./browser";
import type { TemplateSpec } from "./spec";

// Shared by the studio, dashboard, finder and posts pages.

export const LIBRARY_KEY = "slidedrop_library";

// SlideDrop's API refuses changes without this header (see http.ts).
export function appFetch(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, headers: { ...(init.headers ?? {}), "x-slidedrop": "1" } });
}

export async function appJson<T>(url: string, method = "GET", body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await appFetch(url, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = ((await res?.json().catch(() => null)) ?? {}) as T & { error?: string };
  return { ok: Boolean(res?.ok), data: res ? data : ({ error: "generic" } as T & { error?: string }) };
}

export const errorText = (code?: string) => ERRORS[code ?? "generic"] ?? ERRORS.generic;

// Save a format to the library the studio reads (this browser only).
export function addToLibrary(spec: TemplateSpec) {
  const library = loadJson<TemplateSpec[]>(LIBRARY_KEY, []);
  saveJson(LIBRARY_KEY, [spec, ...library.filter((s) => s.id !== spec.id)].slice(0, 50));
}

export const ERRORS: Record<string, string> = {
  limit_reached: "Daily AI limit reached. Raise AI_PER_IP_PER_DAY in .env.local if this is your own machine.",
  refused: "Claude declined that. Try different screenshots or a different topic.",
  generation_failed: "The AI call failed and didn't count against your limit. Try again.",
  bad_request: "Something's missing: add a link or screenshots, or pick a format and type a topic.",
  bad_link: "That doesn't look like a TikTok link. Copy it from TikTok's Share → Copy link.",
  link_unavailable: "TikTok didn't return that post. It may be private or deleted. Use screenshots instead.",
  link_no_cover: "Got the caption but not the cover image. Add a screenshot of at least the first slide.",
  bad_handle: "That doesn't look like a username. Type it like @name, or paste the profile link.",
  instagram_not_configured: "Reading Instagram by name needs your Meta token: set IG_USER_ID and IG_ACCESS_TOKEN (README → Copy a creator).",
  instagram_token_expired: "Your Instagram token expired (they last 60 days). Make a new one: README → Copy a creator.",
  instagram_busy: "Instagram's rate limit kicked in. Wait an hour and try again.",
  instagram_failed: "Instagram didn't answer properly. Try again in a minute.",
  creator_not_found: "Instagram only shares business and creator accounts. This one is personal, private, age-restricted or doesn't exist.",
  tiktok_needs_posts: "TikTok doesn't let apps list someone's posts. Paste links to 3–10 of their best slideshows, or add a screenshot of their profile grid.",
  creator_no_images: "Couldn't get any slide images from that account. Add a few screenshots of their slideshows.",
  instagram_no_hashtag_access: "Meta blocked hashtag search for your app: add the \"Instagram Public Content Access\" feature in your Meta app (it may need Meta's review).",
  bad_hashtag: "Type one hashtag, like #studytok.",
  not_enough_posts: "Add views for at least 3 posted slideshows first.",
  forbidden: "Blocked: that request didn't come from SlideDrop.",
  not_found: "That post doesn't exist any more.",
  generic: "Something went wrong. Please try again.",
};
