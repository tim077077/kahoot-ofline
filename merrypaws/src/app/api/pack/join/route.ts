import { track } from "@/lib/events";
import { memberOr401 } from "@/lib/http";
import { joinPack } from "@/lib/pack";

export async function POST(request: Request) {
  const ctx = await memberOr401(request);
  if (ctx instanceof Response) return ctx;
  const { code } = (await request.json().catch(() => ({}))) as { code?: unknown };
  const result = await joinPack(ctx.store, ctx.accountId, typeof code === "string" ? code.trim().toUpperCase() : "");
  if (result === "joined") await track(ctx.store, "pack_joined");
  const status = result === "joined" || result === "already" ? 200 : result === "full" ? 409 : 400;
  return Response.json({ result }, { status });
}
