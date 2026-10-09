import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Store } from "./store";

// TikTok's official Content Posting API, in draft mode (MEDIA_UPLOAD): the
// carousel lands in your TikTok inbox, you pick a trending sound in the app
// and post. Docs: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
//
// What it needs (README → "Official TikTok drafts"):
// - a TikTok developer app with Login Kit + Content Posting API, scope video.upload
// - TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET
// - SLIDEDROP_PUBLIC_URL: an https address that reaches this computer (a
//   Cloudflare tunnel on a domain you own). TikTok downloads the slides from
//   there, and only from a domain or URL prefix you've verified with TikTok.
//   Login also needs it: TikTok only redirects to https addresses.
//
// Limits: 6 requests a minute, at most 5 drafts waiting in your inbox per 24
// hours, and TikTok app 31.8 or newer.

const API = "https://open.tiktokapis.com";
const AUTH_KEY = "tiktok:auth";
const STATE_KEY = "tiktok:state";
const SECRET_KEY = "slidedrop:secret";
const TIMEOUT_MS = 15000;

export type TikTokAuth = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
  openId: string;
  scope: string;
};

export class TikTokApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export function publicUrl(): string | null {
  const raw = process.env.SLIDEDROP_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

export function officialConfig() {
  return {
    hasKeys: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    publicUrl: publicUrl(),
  };
}

export const redirectUri = () => `${publicUrl()}/api/tiktok/callback`;

// ---- signed slide URLs ------------------------------------------------------
// Slides served to the outside world need a signature, so nobody can list or
// guess your queue through the tunnel.

async function secret(store: Store) {
  const existing = await store.get(SECRET_KEY);
  if (existing) return existing;
  const fresh = randomBytes(32).toString("hex");
  await store.set(SECRET_KEY, fresh, { nx: true });
  return (await store.get(SECRET_KEY)) ?? fresh;
}

export async function slideSignature(store: Store, id: string, n: number) {
  return createHmac("sha256", await secret(store)).update(`${id}/${n}`).digest("hex").slice(0, 32);
}

export async function verifySlideSignature(store: Store, id: string, n: number, sig: string | null) {
  if (!sig || sig.length !== 32) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(await slideSignature(store, id, n)));
}

export async function publicSlideUrls(store: Store, id: string, count: number) {
  const base = publicUrl();
  if (!base) throw new TikTokApiError("SLIDEDROP_PUBLIC_URL is not set", "no_public_url");
  return Promise.all(
    Array.from({ length: count }, async (_, i) => `${base}/api/posts/${id}/slides/${i + 1}?sig=${await slideSignature(store, id, i + 1)}`),
  );
}

// ---- login -------------------------------------------------------------------

export async function authorizeUrl(store: Store) {
  const state = randomBytes(16).toString("hex");
  await store.set(STATE_KEY, state, { ex: 600 });
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.upload");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function checkState(store: Store, state: string | null) {
  const expected = await store.get(STATE_KEY);
  await store.del(STATE_KEY);
  return Boolean(state && expected && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected)));
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(params: Record<string, string>): Promise<TikTokAuth> {
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      ...params,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);
  const data = ((await res?.json().catch(() => null)) ?? {}) as TokenResponse;
  if (!res?.ok || !data.access_token) {
    throw new TikTokApiError(data.error_description || data.error || "TikTok login failed", data.error || "login_failed");
  }
  const now = Date.now();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: now + (data.expires_in ?? 86400) * 1000,
    refreshExpiresAt: now + (data.refresh_expires_in ?? 365 * 86400) * 1000,
    openId: data.open_id ?? "",
    scope: data.scope ?? "",
  };
}

export async function finishLogin(store: Store, code: string) {
  const auth = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  await store.set(AUTH_KEY, JSON.stringify(auth));
  return auth;
}

export async function getAuth(store: Store): Promise<TikTokAuth | null> {
  const raw = await store.get(AUTH_KEY);
  return raw ? (JSON.parse(raw) as TikTokAuth) : null;
}

export async function disconnect(store: Store) {
  await store.del(AUTH_KEY);
}

// A valid access token, refreshed when it has under 5 minutes left.
export async function accessToken(store: Store): Promise<string> {
  const auth = await getAuth(store);
  if (!auth) throw new TikTokApiError("Not connected to TikTok", "not_connected");
  if (auth.expiresAt - Date.now() > 5 * 60 * 1000) return auth.accessToken;
  if (!auth.refreshToken || auth.refreshExpiresAt < Date.now()) {
    throw new TikTokApiError("TikTok login expired, connect again", "not_connected");
  }
  const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: auth.refreshToken });
  await store.set(AUTH_KEY, JSON.stringify(fresh));
  return fresh.accessToken;
}

// ---- posting -------------------------------------------------------------------

type ApiResponse<T> = { data?: T; error?: { code?: string; message?: string } };

async function call<T>(store: Store, endpoint: string, body: unknown): Promise<T> {
  const token = await accessToken(store);
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);
  if (!res) throw new TikTokApiError("TikTok didn't answer", "network");
  const data = ((await res.json().catch(() => null)) ?? {}) as ApiResponse<T>;
  const code = data.error?.code ?? (res.ok ? "ok" : `http_${res.status}`);
  if (code !== "ok" || !data.data) throw new TikTokApiError(data.error?.message || code, code);
  return data.data;
}

// Plain-English versions of the errors you're likely to hit.
export function explainError(code: string): string {
  const map: Record<string, string> = {
    not_connected: "Connect your TikTok account first (Dashboard → Official drafts).",
    no_public_url: "Set SLIDEDROP_PUBLIC_URL to your tunnel's https address and restart.",
    url_ownership_unverified: "TikTok won't download from that address: verify the domain or URL prefix in your TikTok developer app.",
    spam_risk_too_many_pending_share: "Your TikTok inbox already has 5 drafts waiting from the last 24 hours. Post or delete some in the app.",
    app_version_check_failed: "Update the TikTok app on your phone (drafts need 31.8 or newer).",
    rate_limit_exceeded: "Too fast: TikTok allows 6 requests a minute. Wait a minute.",
    access_token_invalid: "Your TikTok login expired. Connect again.",
    scope_not_authorized: "Your login is missing video.upload. Connect again and allow it.",
  };
  return map[code] ?? `TikTok said: ${code}`;
}

export async function sendToDrafts(store: Store, post: { id: string; title: string; caption: string; slideCount: number }) {
  const urls = await publicSlideUrls(store, post.id, post.slideCount);
  const data = await call<{ publish_id: string }>(store, "/v2/post/publish/content/init/", {
    media_type: "PHOTO",
    post_mode: "MEDIA_UPLOAD",
    post_info: { title: post.title, description: post.caption },
    source_info: { source: "PULL_FROM_URL", photo_images: urls, photo_cover_index: 0 },
  });
  return data.publish_id;
}

export type PublishStatus = { status: string; failReason?: string };

export async function publishStatus(store: Store, publishId: string): Promise<PublishStatus> {
  const data = await call<{ status?: string; fail_reason?: string }>(store, "/v2/post/publish/status/fetch/", { publish_id: publishId });
  return { status: data.status ?? "UNKNOWN", failReason: data.fail_reason };
}
