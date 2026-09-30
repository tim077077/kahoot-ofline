import "server-only";
import webpush from "web-push";
import type { Notice, PushSubscriptionJSON, Sender } from "./push";

// VAPID keys: `npx web-push generate-vapid-keys`. The public one is also
// NEXT_PUBLIC_VAPID_PUBLIC_KEY so the phone can subscribe.

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let ready = false;

export const sendPush: Sender = async (sub: PushSubscriptionJSON, notice: Notice) => {
  if (!ready) {
    const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    webpush.setVapidDetails(contact ? `mailto:${contact}` : process.env.NEXT_PUBLIC_SITE_URL || "https://example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    ready = true;
  }
  try {
    // A reminder older than 6 hours isn't worth showing.
    await webpush.sendNotification(sub, JSON.stringify(notice), { TTL: 6 * 3600, urgency: "normal", topic: "daily" });
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    throw err;
  }
};
