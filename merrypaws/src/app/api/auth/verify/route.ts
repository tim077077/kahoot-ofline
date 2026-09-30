import { issueToken, linkEmail, normalizeEmail, verifyCode } from "@/lib/auth";
import { accountIdForToken } from "@/lib/credits";
import { bearerToken, storeOr503 } from "@/lib/http";

// Check the code. Backup: the email is now this album's way back in.
// Sign-in: this phone gets its own token for the album.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; code?: unknown };
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" && /^\d{6}$/.test(body.code.trim()) ? body.code.trim() : null;
  if (!email || !code) return Response.json({ error: "wrong_code" }, { status: 400 });

  const result = await verifyCode(store, email, code);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  if (result.purpose === "backup") {
    // The code was asked for by this album; only this album can use it.
    if ((await accountIdForToken(store, bearerToken(request))) !== result.accountId) {
      return Response.json({ error: "wrong_code" }, { status: 400 });
    }
    if (!(await linkEmail(store, result.accountId, email))) return Response.json({ error: "email_in_use" }, { status: 409 });
    return Response.json({ backedUp: true, email });
  }
  return Response.json({ token: await issueToken(store, result.accountId), email });
}
