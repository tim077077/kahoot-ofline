import { memberOr401 } from "@/lib/http";
import { getProfile, setProfile } from "@/lib/pack";

// The pet's name and kind, so friends in the pack see who they're looking at.
export async function PUT(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return Response.json({ profile: await setProfile(ctx.store, ctx.accountId, body) });
}

// Signing in on a new phone brings the pet's details back with the album.
export async function GET(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  return Response.json({ profile: await getProfile(ctx.store, ctx.accountId) });
}
