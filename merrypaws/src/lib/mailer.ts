import { BRAND } from "./config";

// Sends the sign-in code. Uses Resend's HTTP API (free for 3,000 emails a
// month, 100 a day) so there's no SDK to install. Locally, with no key, the
// code is printed to the server log and handed back to the page instead.

export class MailNotConfiguredError extends Error {}

export async function sendCode(to: string, code: string): Promise<{ dev?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new MailNotConfiguredError("Set RESEND_API_KEY and EMAIL_FROM.");
    console.log(`[dev] sign-in code for ${to}: ${code}`);
    return { dev: code };
  }
  const from = process.env.EMAIL_FROM || `${BRAND} <onboarding@resend.dev>`;
  const text = [
    `Your ${BRAND} code is ${code}`,
    "",
    "Type it into the app to keep your album safe. It works for 15 minutes.",
    "If you didn't ask for this, you can ignore this email.",
  ].join("\n");
  const html = `<div style="font-family:Georgia,serif;background:#f5eee3;color:#2a1b14;padding:32px;border-radius:12px;max-width:420px">
<p style="font-size:18px;margin:0 0 16px">Your ${BRAND} code</p>
<p style="font-size:36px;letter-spacing:8px;margin:0 0 16px;font-family:monospace">${code}</p>
<p style="font-size:15px;color:#6e5646;margin:0">Type it into the app to keep your album safe. It works for 15 minutes. If you didn't ask for this, you can ignore this email.</p>
</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `${code} is your ${BRAND} code`, text, html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text().catch(() => "")}`);
  return {};
}
