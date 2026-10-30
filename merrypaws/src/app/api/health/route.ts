import { fcmConfigured } from "@/lib/fcm";
import { checkStorage, lastPortraitFailure, missing } from "@/lib/health";
import { getObjects } from "@/lib/objects";
import { getStore } from "@/lib/store";
import { pushConfigured } from "@/lib/webpush";

// After deploying, open /api/health on your phone: every line should say true.
// "fix" names what's missing or wrong, never any key.
export async function GET() {
  const env = (...names: string[]) => missing(names).length === 0;
  const fix: Record<string, string> = {};
  let database = false;
  const s = getStore();
  try {
    await s.set("health", new Date().toISOString(), { ex: 60 });
    // The in-memory fallback answers too, but it loses everything on restart.
    const configured = env("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN") || env("KV_REST_API_URL", "KV_REST_API_TOKEN");
    database = configured && (await s.get("health")) !== null;
    if (!configured) fix.database = `Missing: ${missing(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]).join(", ")}`;
  } catch {
    fix.database = "Upstash refused. Paste UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN again (the REST ones, no spaces).";
  }

  // The real storage test writes to the bucket, so a page anyone can open runs
  // it at most once a minute.
  let storage: { ok: boolean; hint?: string };
  const cached = database ? await s.get("health:storage").catch(() => null) : null;
  if (cached) storage = JSON.parse(cached);
  else {
    storage = await checkStorage(getObjects);
    if (database) await s.set("health:storage", JSON.stringify(storage), { ex: 60 }).catch(() => {});
  }
  if (storage.hint) fix.photoStorage = storage.hint;

  const need = (key: string, names: string[]) => {
    const gaps = missing(names);
    if (gaps.length) fix[key] = `Missing: ${gaps.join(", ")}`;
    return gaps.length === 0;
  };
  const checks = {
    database,
    photoStorage: storage.ok,
    portraits: env("GEMINI_API_KEY") || env("GOOGLE_API_KEY") || need("portraits", ["GEMINI_API_KEY"]),
    payments: need("payments", ["NEXT_PUBLIC_REVENUECAT_WEB_KEY", "REVENUECAT_WEBHOOK_AUTH"]),
    restorePurchases: need("restorePurchases", ["REVENUECAT_SECRET_KEY"]),
    email: need("email", ["RESEND_API_KEY", "EMAIL_FROM"]),
    reminders: pushConfigured() && need("reminders", ["CRON_SECRET"]),
    appPush: fcmConfigured(),
    stats: need("stats", ["STATS_KEY"]),
    siteUrl: env("NEXT_PUBLIC_SITE_URL") && !process.env.NEXT_PUBLIC_SITE_URL!.includes("localhost"),
  };
  if (!pushConfigured()) fix.reminders = `Missing: ${missing(["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "CRON_SECRET"]).join(", ")}`;
  if (!checks.appPush) fix.appPush = "Missing or unreadable: FIREBASE_SERVICE_ACCOUNT";
  if (!checks.siteUrl) fix.siteUrl = "Set NEXT_PUBLIC_SITE_URL to the site's address (build variable).";
  // Set up isn't the same as working: the last failed portrait says why.
  const failure = database ? await lastPortraitFailure(s) : null;
  if (failure) fix.lastPortraitFailure = `${failure.at}: ${failure.reason}`;
  return Response.json({ ready: Object.values(checks).every(Boolean), ...checks, fix }, { headers: { "Cache-Control": "no-store" } });
}
