import { accountIdForToken, createAccount } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";
import { getPortrait } from "@/lib/portraits";

// Called right before RevenueCat's checkout opens.
//   { unlockId?: portrait id }  when buying a pack from a preview
//
// Makes sure the album has an account (the purchase is made as that account,
// so the webhook knows whose it is) and remembers which portrait to unlock
// once the pack is paid for.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const body = (await request.json().catch(() => ({}))) as { unlockId?: unknown };

  let accountId = await accountIdForToken(store, bearerToken(request));
  let token: string | undefined;
  if (!accountId) {
    const created = await createAccount(store);
    accountId = created.account.id;
    token = created.token;
  }

  const unlockId = typeof body.unlockId === "string" ? body.unlockId : null;
  if (unlockId && (await getPortrait(store, unlockId))) await store.set(`payunlock:${accountId}`, unlockId, { ex: 2 * 60 * 60 });
  else await store.del(`payunlock:${accountId}`);

  return Response.json({ accountId, token });
}
