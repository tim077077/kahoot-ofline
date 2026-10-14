import "server-only";
import type { Notice, PushSubscriptionJSON, Sender } from "./push";
import { encryptPayload, vapidHeader } from "./webpushCrypto";

// VAPID keys: `npx web-push generate-vapid-keys`. The public one is also
// NEXT_PUBLIC_VAPID_PUBLIC_KEY so the phone can subscribe.

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export const sendPush: Sender = async (sub: PushSubscriptionJSON, notice: Notice) => {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const subject = contact ? `mailto:${contact}` : process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const body = await encryptPayload(new TextEncoder().encode(JSON.stringify(notice)), sub.keys.p256dh, sub.keys.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(sub.endpoint, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      // A reminder older than 6 hours isn't worth showing.
      TTL: String(6 * 3600),
      Urgency: "normal",
      Topic: "daily",
    },
    body: body as BodyInit,
  });
  if (res.status === 404 || res.status === 410) return "gone";
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
  return "sent";
};
