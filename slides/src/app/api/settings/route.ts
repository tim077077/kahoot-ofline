import { forbidCrossSite, storeOr503 } from "@/lib/http";
import { getSettings, saveSettings, type Settings } from "@/lib/posting";

export async function GET() {
  const store = storeOr503();
  if (store instanceof Response) return store;
  return Response.json({ settings: await getSettings(store) });
}

export async function PUT(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Partial<Settings>;
  return Response.json({ settings: await saveSettings(store, body) });
}
