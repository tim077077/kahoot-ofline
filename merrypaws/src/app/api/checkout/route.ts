import type Stripe from "stripe";
import { BRAND, PACKS, PAID_TIERS, siteUrl, TIERS, type Interval, type PackId, type Tier } from "@/lib/config";
import { accountIdForToken, createAccount } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";
import { getPortrait } from "@/lib/portraits";
import { getStripe } from "@/lib/stripe";

// Web checkout (Stripe). The store apps use in-app purchases instead; see
// README, "Going to the stores".
//   { kind: "plan", tier: "plus" | "pro", interval: "month" | "year" }
//   { kind: "pack", pack: "p3" | "p10" | "p25", unlockId?: portrait id }
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    tier?: string;
    interval?: string;
    pack?: string;
    unlockId?: string;
  };
  const pack = body.kind === "pack" ? PACKS[body.pack as PackId] : undefined;
  const tier = body.kind === "plan" && PAID_TIERS.includes(body.tier as Tier) ? TIERS[body.tier as Tier] : undefined;
  const interval: Interval = body.interval === "year" ? "year" : "month";
  if (!pack && !tier) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  // Top up the existing account when the phone already has one, otherwise
  // create it now so the buyer's token exists before they pay.
  let accountId = await accountIdForToken(store, bearerToken(request));
  let newToken: string | undefined;
  if (!accountId) {
    const created = await createAccount(store);
    accountId = created.account.id;
    newToken = created.token;
  }

  // Paying from a preview unlocks that portrait automatically in the webhook.
  const unlockId = pack && body.unlockId && (await getPortrait(store, body.unlockId)) ? body.unlockId : undefined;
  const back = new URL(`${siteUrl()}/`);
  if (unlockId) back.searchParams.set("portrait", unlockId);
  const success = new URL(back);
  success.searchParams.set("paid", pack ? "pack" : "plan");

  const common = {
    client_reference_id: accountId,
    allow_promotion_codes: true,
    success_url: success.toString(),
    cancel_url: back.toString(),
  } satisfies Partial<Stripe.Checkout.SessionCreateParams>;

  const session = pack
    ? await getStripe().checkout.sessions.create({
        ...common,
        mode: "payment",
        customer_creation: "always",
        metadata: { accountId, kind: "pack", pack: pack.id, ...(unlockId ? { unlockId } : {}) },
        line_items: [
          {
            quantity: 1,
            price_data: { currency: "usd", unit_amount: pack.price, product_data: { name: `${BRAND}: ${pack.name}` } },
          },
        ],
      })
    : await getStripe().checkout.sessions.create({
        ...common,
        mode: "subscription",
        metadata: { accountId, kind: "plan", tier: tier!.id, interval },
        subscription_data: { metadata: { accountId, tier: tier!.id, interval } },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: tier!.price[interval],
              recurring: { interval },
              product_data: { name: `${BRAND} ${tier!.name}` },
            },
          },
        ],
      });

  return Response.json({ url: session.url, token: newToken });
}
