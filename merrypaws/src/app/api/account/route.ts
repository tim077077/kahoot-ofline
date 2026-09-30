import { LIMITS, TIERS } from "@/lib/config";
import { accountIdForToken, createAccount, deleteAccount, freeTrialsLeft, getCredits } from "@/lib/credits";
import { bearerToken, guestOf, storeOr503 } from "@/lib/http";
import { getObjects } from "@/lib/objects";
import { deleteAllPhotos, photoCount } from "@/lib/photos";
import { currentTier, getPlan, previewsLeft, refreshAllowance } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

// Everything the app shows about the member: plan, album usage, credits.
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

  if (!accountId) {
    // A token we don't recognise tells the client to forget it.
    return Response.json({
      account: false,
      invalidToken: Boolean(token),
      tier: "free",
      credits: 0,
      previews: 0,
      photos: 0,
      photoLimit: TIERS.free.photos,
      freeLeft,
    });
  }

  await refreshAllowance(store, accountId);
  const tier = await currentTier(store, accountId);
  const plan = await getPlan(store, accountId);
  return Response.json({
    account: true,
    tier,
    renewsUntil: tier !== "free" && plan ? new Date(plan.until).toISOString() : null,
    interval: tier !== "free" ? plan?.interval : null,
    credits: await getCredits(store, accountId),
    previews: await previewsLeft(store, accountId),
    photos: await photoCount(store, accountId),
    photoLimit: TIERS[tier].photos,
    freeLeft,
  });
}

// A quiet guest account, made the first time someone adds a photo. No email,
// no password: the phone keeps the token (and can export it as an access link).
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const existing = await accountIdForToken(store, bearerToken(request));
  if (existing) return Response.json({ token: bearerToken(request) });
  const { token } = await createAccount(store);
  return Response.json({ token });
}

// "Delete my data": the album, the account, its credits and plan, plus the
// portraits this device made. An active subscription is cancelled first so
// nobody keeps paying for an album that no longer exists.
export async function DELETE(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const { portraits } = (await request.json().catch(() => ({}))) as { portraits?: unknown };
  const ids = Array.isArray(portraits)
    ? portraits.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)).slice(0, 100)
    : [];
  for (const id of ids) {
    await store.del(`portrait:${id}`);
    await store.del(`unlocked:${id}`);
  }

  const token = bearerToken(request);
  const accountId = await accountIdForToken(store, token);
  let photos = 0;
  if (accountId && token) {
    const plan = await getPlan(store, accountId);
    if (plan?.subscriptionId && plan.until > Date.now() && process.env.STRIPE_SECRET_KEY) {
      try {
        await getStripe().subscriptions.cancel(plan.subscriptionId);
      } catch (err) {
        console.error("subscription cancel failed", err);
        return Response.json({ error: "cancel_failed" }, { status: 502 });
      }
    }
    photos = await deleteAllPhotos(store, getObjects(), accountId);
    await store.del(`plan:${accountId}`);
    await store.del(`subprev:${accountId}`);
    await store.del(`previews:${accountId}`);
    await deleteAccount(store, token);
  }
  return Response.json({ deleted: true, account: Boolean(accountId), photos, portraits: ids.length });
}
