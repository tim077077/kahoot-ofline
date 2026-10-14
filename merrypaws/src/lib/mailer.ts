import { BRAND } from "./config";
import type { CodePurpose } from "./auth";
import { backedUpEmail, codeEmail, type Email } from "./emails";

// Sends the sign-in code and the "album is safe" email (see emails.ts). Uses Resend's HTTP API (free for 3,000 emails a
// month, 100 a day) so there's no SDK to install. Locally, with no key, the
// code is printed to the server log and handed back to the page instead.

export class MailNotConfiguredError extends Error {}

export async function sendCode(to: string, code: string, purpose: CodePurpose = "backup"): Promise<{ dev?: string }> {
  const sent = await send(to, codeEmail(code, purpose));
  if (sent === "dev") {
    console.log(`[dev] sign-in code for ${to}: ${code}`);
    return { dev: code };
  }
  return {};
}

// Best effort: a backup that went through is never undone by a failed email.
export async function sendBackedUp(to: string, petName: string): Promise<void> {
  await send(to, backedUpEmail(petName)).catch((err) => console.error("backed-up email failed", err));
}

async function send(to: string, email: Email): Promise<"sent" | "dev"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new MailNotConfiguredError("Set RESEND_API_KEY and EMAIL_FROM.");
    return "dev";
  }
  const from = process.env.EMAIL_FROM || `${BRAND} <onboarding@resend.dev>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text().catch(() => "")}`);
  return "sent";
}
