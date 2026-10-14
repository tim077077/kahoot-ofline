import { storeOr503 } from "@/lib/http";
import { sendDue } from "@/lib/push";
import { pushConfigured, sendPush } from "@/lib/webpush";

// Hourly: send the reminders due this hour. On Cloudflare the Cron Trigger in
// wrangler.jsonc calls it (see worker.ts); anywhere else, point any scheduler
// at it with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const store = storeOr503();
  if (store instanceof Response) return store;
  return Response.json(await sendDue(store, sendPush));
}
