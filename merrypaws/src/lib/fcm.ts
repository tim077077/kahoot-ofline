import "server-only";
import type { Store } from "./store";

// Firebase Cloud Messaging (HTTP v1): native push to the Android and iOS apps.
// One service for both, because Apple's push service needs HTTP/2, which a
// Cloudflare Worker can't speak; Firebase relays to Apple for us.
//
// FIREBASE_SERVICE_ACCOUNT is the whole service-account JSON from Firebase →
// Project settings → Service accounts → Generate new private key.

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

export type NativeMessage = { title: string; body: string; data?: Record<string, string>; collapseKey?: string };
export type NativeSender = (token: string, message: NativeMessage) => Promise<"sent" | "gone">;

function account(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    return parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

export const fcmConfigured = () => account() !== null;

const b64url = (bytes: ArrayBuffer | Uint8Array | string) => {
  const bin = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function signedJwt(sa: ServiceAccount, now: number) {
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(signature)}`;
}

// Google's access tokens last an hour; keep one in the store so every Worker
// isolate doesn't sign a new one per push.
async function accessToken(store: Store, sa: ServiceAccount) {
  const cached = await store.get("fcm:access");
  if (cached) return cached;
  const now = Math.floor(Date.now() / 1000);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await signedJwt(sa, now) }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status} ${await res.text().catch(() => "")}`);
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  await store.set("fcm:access", access_token, { ex: Math.max(60, (expires_in ?? 3600) - 300) });
  return access_token;
}

export function fcmSender(store: Store): NativeSender | null {
  const sa = account();
  if (!sa) return null;
  return async (token, message) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${await accessToken(store, sa)}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: {
            priority: "normal",
            collapse_key: message.collapseKey,
            notification: { icon: "ic_stat_paw", color: "#7a1018", tag: message.collapseKey },
          },
          apns: { headers: message.collapseKey ? { "apns-collapse-id": message.collapseKey } : {}, payload: { aps: { sound: "default" } } },
        },
      }),
    });
    if (res.ok) return "sent";
    const text = await res.text().catch(() => "");
    // The app was uninstalled or the token rotated.
    if (res.status === 404 || text.includes("UNREGISTERED")) return "gone";
    if (res.status === 401) await store.del("fcm:access");
    throw new Error(`FCM send failed: ${res.status} ${text}`);
  };
}
