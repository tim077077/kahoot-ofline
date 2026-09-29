import { LIMITS } from "@/lib/config";
import { accountIdForToken, freeTrialsLeft, getCredits } from "@/lib/credits";
import { bearerToken, clientIp } from "@/lib/http";
import { getStore, StoreNotConfiguredError } from "@/lib/store";

export async function GET(request: Request) {
  let store;
  try {
    store = getStore();
  } catch (err) {
    if (err instanceof StoreNotConfiguredError) return Response.json({ error: "not_configured" }, { status: 503 });
    throw err;
  }

  const token = bearerToken(request);
  const accountId = await accountIdForToken(store, token);
  const freeLeft = await freeTrialsLeft(store, clientIp(request), {
    perIp: LIMITS.freePerIpPerDay,
    global: LIMITS.freeGlobalPerDay,
  });

  if (accountId) return Response.json({ account: true, credits: await getCredits(store, accountId), freeLeft });
  // A token we don't recognise tells the client to forget it.
  return Response.json({ account: false, invalidToken: Boolean(token), credits: 0, freeLeft });
}
