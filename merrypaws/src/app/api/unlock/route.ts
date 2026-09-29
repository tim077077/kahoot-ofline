import { accountIdForToken, getCredits } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";
import { unlockWithCredit } from "@/lib/portraits";

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  const accountId = await accountIdForToken(store, bearerToken(request));
  if (!accountId) return Response.json({ error: "no_credits" }, { status: 402 });
  if (typeof id !== "string") return Response.json({ error: "bad_request" }, { status: 400 });

  const result = await unlockWithCredit(store, id, accountId);
  if (result === "missing") return Response.json({ error: "expired" }, { status: 404 });
  if (result === "no_credits") return Response.json({ error: "no_credits" }, { status: 402 });
  return Response.json({ unlocked: true, credits: await getCredits(store, accountId) });
}
