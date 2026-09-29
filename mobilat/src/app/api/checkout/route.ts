import { BRAND, currencyFor, isLocale, PLANS, siteUrl, type PlanId } from "@/lib/config";
import { accountIdForToken, createAccount } from "@/lib/credits";
import { bearerToken } from "@/lib/http";
import { getStore, StoreNotConfiguredError } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

const PLAN_NAMES: Record<PlanId, { ro: string; en: string }> = {
  starter: { ro: "10 imagini mobilate virtual", en: "10 virtually staged photos" },
  agent: { ro: "50 imagini mobilate virtual", en: "50 virtually staged photos" },
  pro: { ro: "Pro — 150 imagini pe lună", en: "Pro — 150 photos per month" },
};

export async function POST(request: Request) {
  let store;
  try {
    store = getStore();
  } catch (err) {
    if (err instanceof StoreNotConfiguredError) return Response.json({ error: "not_configured" }, { status: 503 });
    throw err;
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: string; lang?: string };
  const plan = PLANS[body.plan as PlanId];
  const lang = body.lang && isLocale(body.lang) ? body.lang : "ro";
  if (!plan) return Response.json({ error: "bad_plan" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  // Top up the existing account when the browser already has one, otherwise
  // create it now so the buyer's token exists before they pay.
  let accountId = await accountIdForToken(store, bearerToken(request));
  let newToken: string | undefined;
  if (!accountId) {
    const created = await createAccount(store);
    accountId = created.account.id;
    newToken = created.token;
  }

  const currency = currencyFor(lang);
  const metadata = { accountId, plan: plan.id };

  const session = await getStripe().checkout.sessions.create({
    mode: plan.mode,
    locale: lang,
    client_reference_id: accountId,
    metadata,
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: plan.price[currency],
          product_data: { name: `${BRAND} — ${PLAN_NAMES[plan.id][lang]}` },
          ...(plan.mode === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    ...(plan.mode === "subscription" ? { subscription_data: { metadata } } : { customer_creation: "always" as const }),
    success_url: `${siteUrl()}/${lang}/studio?paid=1`,
    cancel_url: `${siteUrl()}/${lang}/studio?canceled=1`,
  });

  return Response.json({ url: session.url, token: newToken });
}
