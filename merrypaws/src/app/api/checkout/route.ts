import { BRAND, PLANS, siteUrl, type PlanId } from "@/lib/config";
import { accountIdForToken, createAccount } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";
import { getPortrait } from "@/lib/portraits";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;

  const body = (await request.json().catch(() => ({}))) as { plan?: string; unlockId?: string };
  const plan = PLANS[body.plan as PlanId];
  if (!plan) return Response.json({ error: "bad_plan" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  // Paying from a preview unlocks that portrait automatically in the webhook.
  const unlockId = body.unlockId && (await getPortrait(store, body.unlockId)) ? body.unlockId : undefined;

  // Top up the existing account when the browser already has one, otherwise
  // create it now so the buyer's token exists before they pay.
  let accountId = await accountIdForToken(store, bearerToken(request));
  let newToken: string | undefined;
  if (!accountId) {
    const created = await createAccount(store);
    accountId = created.account.id;
    newToken = created.token;
  }

  const back = new URL(`${siteUrl()}/`);
  if (unlockId) back.searchParams.set("portrait", unlockId);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: accountId,
    metadata: { accountId, plan: plan.id, ...(unlockId ? { unlockId } : {}) },
    allow_promotion_codes: true,
    customer_creation: "always",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.price,
          product_data: { name: `${BRAND} — ${plan.name}` },
        },
      },
    ],
    success_url: `${back.toString()}${unlockId ? "&" : "?"}paid=1`,
    cancel_url: back.toString(),
  });

  return Response.json({ url: session.url, token: newToken });
}
