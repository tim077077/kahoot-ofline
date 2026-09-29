import Stripe from "stripe";

let client: Stripe | null = null;

// Created lazily so builds don't need the secret key.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}
