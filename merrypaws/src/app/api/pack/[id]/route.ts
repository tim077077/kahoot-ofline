import { memberOr401 } from "@/lib/http";
import { leavePack } from "@/lib/pack";

export async function DELETE(request: Request, { params }: RouteContext<"/api/pack/[id]">) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  await leavePack(ctx.store, ctx.accountId, id);
  return new Response(null, { status: 204 });
}
