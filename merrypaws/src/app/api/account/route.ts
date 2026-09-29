import { LIMITS } from "@/lib/config";
import { accountIdForToken, freeTrialsLeft, getCredits } from "@/lib/credits";
import { bearerToken, clientIp, storeOr503 } from "@/lib/http";

export async function GET(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

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
