import { LIMITS } from "@/lib/config";
import { accountIdForToken, freeTrialsLeft } from "@/lib/credits";
import { bearerToken, clientIp, storeOr503 } from "@/lib/http";
import { isPro } from "@/lib/pro";

export async function GET(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const token = bearerToken(request);
  const accountId = await accountIdForToken(store, token);
  const freeLeft = await freeTrialsLeft(store, clientIp(request), {
    perIp: LIMITS.freePerIpPerDay,
    global: LIMITS.freeGlobalPerDay,
  });

  // A token we don't recognise tells the client to forget it.
  return Response.json({
    account: Boolean(accountId),
    invalidToken: Boolean(token) && !accountId,
    pro: await isPro(store, accountId),
    freeLeft,
  });
}
