import { normalizeEmail, requestCode, type CodePurpose } from "@/lib/auth";
import { accountIdForToken } from "@/lib/credits";
import { bearerToken, clientIp, storeOr503 } from "@/lib/http";
import { MailNotConfiguredError, sendCode } from "@/lib/mailer";

// Email a 6-digit code. "backup" attaches the email to this phone's album;
// "signin" gets an album back on a new phone. Sign-in answers the same way
// whether or not the email has an album, so emails can't be probed.
export async function POST(request: Request) {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; purpose?: unknown };
  const email = normalizeEmail(body.email);
  const purpose: CodePurpose | null = body.purpose === "backup" || body.purpose === "signin" ? body.purpose : null;
  if (!email || !purpose) return Response.json({ error: "bad_email" }, { status: 400 });

  const accountId = await accountIdForToken(store, bearerToken(request));
  if (purpose === "backup" && !accountId) return Response.json({ error: "no_account" }, { status: 401 });

  const result = await requestCode(store, { email, purpose, accountId, ip: clientIp(request) });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "slow_down" ? 429 : 409 });
  if (!result.code) return Response.json({ sent: true });
  try {
    const { dev } = await sendCode(email, result.code);
    return Response.json({ sent: true, ...(dev ? { devCode: dev } : {}) });
  } catch (err) {
    if (err instanceof MailNotConfiguredError) return Response.json({ error: "email_not_configured" }, { status: 503 });
    console.error("send code failed", err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
