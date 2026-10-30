import { clientIp, memberOr401 } from "@/lib/http";
import { claimOwner } from "@/lib/owner";

// Turns on owner mode for this album when the code matches OWNER_CODE.
export async function POST(request: Request) {
  const member = await memberOr401(request);
  if (member instanceof Response) return member;
  const { code } = (await request.json().catch(() => ({}))) as { code?: unknown };
  const result = await claimOwner(member.store, member.accountId, code, clientIp(request));
  if (result === "owner") return Response.json({ owner: true });
  if (result === "slow_down") return Response.json({ error: "slow_down" }, { status: 429 });
  return Response.json({ error: result === "off" ? "not_configured" : "wrong_code" }, { status: result === "off" ? 503 : 403 });
}
