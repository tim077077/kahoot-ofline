import { isClientEvent, track } from "@/lib/events";
import { storeOr503 } from "@/lib/http";

// Fire-and-forget funnel events from the app. Unknown names are ignored.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const { name } = (await request.json().catch(() => ({}))) as { name?: unknown };
  if (!isClientEvent(name)) return Response.json({ error: "bad_request" }, { status: 400 });
  await track(store, name);
  return new Response(null, { status: 204 });
}
