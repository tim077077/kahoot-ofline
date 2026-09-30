import { LIMITS } from "@/lib/config";
import { accountIdForToken, deleteAccount, freeTrialsLeft, getCredits } from "@/lib/credits";
import { bearerToken, guestOf, storeOr503 } from "@/lib/http";

export async function GET(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const token = bearerToken(request);
  const accountId = await accountIdForToken(store, token);
  const freeLeft = await freeTrialsLeft(store, guestOf(request), {
    perDevice: LIMITS.freePerDevice,
    perIp: LIMITS.freePerIpPerDay,
    global: LIMITS.freeGlobalPerDay,
  });

  if (accountId) return Response.json({ account: true, credits: await getCredits(store, accountId), freeLeft });
  // A token we don't recognise tells the client to forget it.
  return Response.json({ account: false, invalidToken: Boolean(token), credits: 0, freeLeft });
}

// "Delete my data": removes the account and its tickets, plus the portraits
// this device made (their ids are capabilities, so knowing one is enough).
export async function DELETE(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { portraits } = (await request.json().catch(() => ({}))) as { portraits?: unknown };
  const ids = Array.isArray(portraits) ? portraits.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)).slice(0, 100) : [];
  for (const id of ids) {
    await store.del(`portrait:${id}`);
    await store.del(`unlocked:${id}`);
  }
  const token = bearerToken(request);
  const deleted = token ? await deleteAccount(store, token) : false;
  return Response.json({ deleted: true, account: deleted, portraits: ids.length });
}
