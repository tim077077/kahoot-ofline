import { BRAND, PRO, siteUrl } from "@/lib/config";
import { accountIdForToken, createAccount } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  // Reuse the browser's account if it has one, otherwise create it now so the
  // buyer's token exists before they pay.
  let accountId = await accountIdForToken(store, bearerToken(request));
  let newToken: string | undefined;
  if (!accountId) {
    const created = await createAccount(store);
    accountId = created.account.id;
    newToken = created.token;
  }

  const metadata = { accountId, plan: "pro" };
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    client_reference_id: accountId,
    metadata,
    subscription_data: { metadata },
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRO.price,
          recurring: { interval: "month" },
          product_data: { name: `${BRAND} Pro` },
        },
      },
    ],
    success_url: `${siteUrl()}/editor?pro=1`,
    cancel_url: `${siteUrl()}/editor`,
  });

  return Response.json({ url: session.url, token: newToken });
}
