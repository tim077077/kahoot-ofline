import { siteUrl } from "@/lib/config";
import { memberOr401 } from "@/lib/http";
import { getStripe } from "@/lib/stripe";

// "Manage or cancel": Stripe's own billing page for web subscribers.
// Cancelling must be as easy as subscribing. Store subscribers manage theirs
// in the App Store or Google Play settings.
export async function POST(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const customer = await ctx.store.get(`customer:${ctx.accountId}`);
  if (!customer || !process.env.STRIPE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({ customer, return_url: `${siteUrl()}/` });
  return Response.json({ url: session.url });
}
