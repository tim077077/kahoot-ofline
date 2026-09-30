import { memberOr401 } from "@/lib/http";
import { setProfile } from "@/lib/pack";

// The pet's name and kind, so friends in the pack see who they're looking at.
export async function PUT(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return Response.json({ profile: await setProfile(ctx.store, ctx.accountId, body) });
}
