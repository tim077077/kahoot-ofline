import { parseCrash, underCrashLimit } from "@/lib/crashLog";
import { track } from "@/lib/events";
import { clientIp, storeOr503 } from "@/lib/http";

// Crash reports from the app. They land in the Worker logs as
// "client_crash" (Cloudflare dashboard → the Worker → Logs) and are counted
// per day in /api/stats.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const raw = (await request.text().catch(() => "")).slice(0, 8000);
  const crash = parseCrash(raw);
  if (!crash) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!(await underCrashLimit(store, clientIp(request)).catch(() => true))) return new Response(null, { status: 429 });
  console.error("client_crash", JSON.stringify(crash));
  await track(store, "client_crash");
  return new Response(null, { status: 204 });
}
