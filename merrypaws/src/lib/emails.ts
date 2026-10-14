import type { CodePurpose } from "./auth";
import { BRAND, siteUrl } from "./config";

// Branded emails, in the app's cream-and-burgundy album look.
//
// Email clients are not browsers: layout is tables, every style is inline,
// fonts fall back to Georgia, and images are absolute URLs to files the site
// already serves (the example portraits in public/styles). Never the owner's
// own photos: those links are signed and expire, and an inbox keeps mail for
// years. Every email also has a plain-text version.

const C = { paper: "#f5eee3", card: "#fbf7f0", ink: "#2a1b14", muted: "#6e5646", accent: "#7a0f1b", line: "#e6dccb" };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export type Email = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Three example portraits side by side, like prints on a table.
function filmStrip(base: string, ids: string[]): string {
  const cells = ids
    .map(
      (id, i) => `<td width="33%" style="padding:0 6px" valign="top">
  <img src="${base}/styles/${id}.jpg" width="160" alt="" style="display:block;width:100%;max-width:160px;height:auto;border:6px solid #ffffff;border-bottom-width:18px;box-shadow:0 6px 16px rgba(58,34,20,0.18);transform:rotate(${[-2, 1, 2][i]}deg)">
</td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px"><tr>${cells}</tr></table>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 4px"><tr><td style="border-radius:999px;background:${C.accent}">
  <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:16px;font-weight:600;color:${C.card};text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;
}

type Layout = { preheader: string; heading: string; body: string; footer: string };

function layout({ preheader, heading, body, footer }: Layout): string {
  const base = siteUrl();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${C.paper}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td align="center" style="padding-bottom:20px">
      <a href="${base}" style="text-decoration:none"><img src="${base}/icon-192.png" width="44" height="44" alt="" style="display:inline-block;border-radius:12px;vertical-align:middle">
      <span style="font-family:${SERIF};font-style:italic;font-size:22px;color:${C.ink};vertical-align:middle;padding-left:10px">${BRAND}</span></a>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:36px 28px;text-align:center">
      <h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:${C.ink}">${esc(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:22px 12px 0;text-align:center;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted}">
      ${footer}<br>${BRAND} · <a href="${base}" style="color:${C.muted}">${base.replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const p = (text: string, extra = "") =>
  `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.55;color:${C.muted};${extra}">${text}</p>`;

// The 6-digit code. The code leads the subject and preheader so it shows in
// the notification without opening the email.
export function codeEmail(code: string, purpose: CodePurpose): Email {
  const heading = purpose === "backup" ? "Keep your album safe" : "Welcome back";
  const why =
    purpose === "backup"
      ? "Type this code into the app and your album is backed up to this email. If you lose your phone, it comes back with you."
      : "Type this code into the app to open your album on this phone.";
  const html = layout({
    preheader: `${code} is your code. It works for 15 minutes.`,
    heading,
    body: [
      filmStrip(siteUrl(), ["royal-court", "painted-pet", "family-album"]),
      p(why),
      `<div style="margin:6px auto 18px;display:inline-block;padding:16px 26px;border:1px dashed ${C.accent};border-radius:14px;background:${C.paper};font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;letter-spacing:10px;color:${C.ink}">${esc(code)}</div>`,
      p("It works for 15 minutes.", "font-size:14px;margin:0"),
    ].join("\n"),
    footer: "Didn't ask for this? You can ignore this email; nothing changes without the code.",
  });
  const text = [`${heading}`, "", `Your ${BRAND} code is ${code}`, "", why, "It works for 15 minutes.", "", "Didn't ask for this? You can ignore this email."].join("\n");
  return { subject: `${code} is your ${BRAND} code`, html, text };
}

// After a backup goes through: proof it worked, and a nudge back to the app.
export function backedUpEmail(petName: string): Email {
  const name = petName.trim() || "your pet";
  const possessive = petName.trim() ? `${name}'s` : "Your";
  const base = siteUrl();
  const html = layout({
    preheader: `${possessive} album is backed up to this email.`,
    heading: `${possessive} album is safe`,
    body: [
      p(`Every photo of ${esc(name)} is now backed up to this email. New phone, lost phone, cracked phone: sign in with this address and the whole album comes back.`),
      filmStrip(base, ["golden-age", "your-scene", "holiday-special"]),
      p(`Next time you're in, paint ${esc(name)} into another world: a royal court, a film noir, or a scene you dream up yourself.`),
      button(base, "Open the album"),
    ].join("\n"),
    footer: "You're getting this because you backed up an album with this address.",
  });
  const text = [
    `${possessive} album is safe`,
    "",
    `Every photo of ${name} is now backed up to this email. On a new phone, sign in with this address and the whole album comes back.`,
    "",
    `Open the album: ${base}`,
  ].join("\n");
  return { subject: `${possessive} album is backed up`, html, text };
}
