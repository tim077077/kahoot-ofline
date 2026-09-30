import { timingSafeEqual } from "node:crypto";
import { readStats } from "@/lib/events";
import { storeOr503 } from "@/lib/http";

// Your funnel for the last two weeks: GET /api/stats with
// "Authorization: Bearer <STATS_KEY>". Off until STATS_KEY is set.
export async function GET(request: Request) {
  const key = process.env.STATS_KEY;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!key || given.length !== key.length || !timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const store = storeOr503();
  if (store instanceof Response) return store;
  return Response.json({ days: await readStats(store, 14) });
}
