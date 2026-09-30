import { track } from "@/lib/events";
import { storeOr503 } from "@/lib/http";
import { getPortrait } from "@/lib/portraits";

const REASONS = ["inappropriate", "not_my_pet", "other"] as const;

// "Report" on a result. Reports are kept for 90 days under report:<id> so you
// can review them; repeated reports of one portrait overwrite each other.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const { id, reason } = (await request.json().catch(() => ({}))) as { id?: unknown; reason?: unknown };
  if (typeof id !== "string" || !REASONS.includes(reason as (typeof REASONS)[number])) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const portrait = await getPortrait(store, id);
  if (!portrait) return Response.json({ error: "expired" }, { status: 404 });
  await store.set(
    `report:${id}`,
    JSON.stringify({ reason, style: portrait.style, fullUrl: portrait.fullUrl, at: new Date().toISOString() }),
    { ex: 90 * 24 * 60 * 60 },
  );
  console.warn("portrait reported", id, reason);
  await track(store, "report");
  return Response.json({ reported: true });
}
