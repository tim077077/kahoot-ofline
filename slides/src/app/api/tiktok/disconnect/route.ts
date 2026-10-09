import { forbidCrossSite, storeOr503 } from "@/lib/http";
import { disconnect } from "@/lib/tiktok-official";

export async function POST(request: Request) {
  const blocked = forbidCrossSite(request);
  if (blocked) return blocked;
  const store = storeOr503();
  if (store instanceof Response) return store;
  await disconnect(store);
  return Response.json({ ok: true });
}
