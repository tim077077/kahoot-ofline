import { getStore } from "@/lib/store";
import { pushConfigured } from "@/lib/webpush";

// After deploying, open /api/health on your phone: every line should say true.
// Only says whether each service is set up, never any key.
export async function GET() {
  const env = (...names: string[]) => names.every((n) => Boolean(process.env[n]));
  let store = false;
  try {
    const s = getStore();
    await s.set("health", new Date().toISOString(), { ex: 60 });
    // The in-memory fallback answers too, but it loses everything on restart.
    const configured = env("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN") || env("KV_REST_API_URL", "KV_REST_API_TOKEN");
    store = configured && (await s.get("health")) !== null;
  } catch {
    store = false;
  }
  const checks = {
    database: store,
    photoStorage: env("S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"),
    portraits: env("FAL_KEY"),
    payments: env("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"),
    email: env("RESEND_API_KEY", "EMAIL_FROM"),
    reminders: pushConfigured() && env("CRON_SECRET"),
    stats: env("STATS_KEY"),
    siteUrl: env("NEXT_PUBLIC_SITE_URL") && !process.env.NEXT_PUBLIC_SITE_URL!.includes("localhost"),
  };
  return Response.json({ ready: Object.values(checks).every(Boolean), ...checks });
}
