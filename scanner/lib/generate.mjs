// STEP 4 - generate a demo site from the property's photos, using OpenAI vision.
//
// Uses the OpenAI Chat Completions API (/v1/chat/completions) over plain fetch, so
// the only npm dependency in this project is Express. Model is configurable
// (OPENAI_MODEL, default "gpt-4o"); any vision-capable model your key can access
// works (gpt-4o, gpt-4.1, gpt-5, ...).

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRetry, fetchJson, slugify } from "./util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "..", "output");
// The API base is resolved per request in generateSite, so this works with OpenAI,
// OpenRouter, or any OpenAI-compatible gateway (local model server, Together, Groq...).

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// The house method, compact. The anti-template / structure-variance rules are the
// important part: without them every demo comes out as the same wireframe.
const SYSTEM = `You are the build assistant for Cadru, a Romanian web-design studio that makes bespoke
sites for hotels and pensions. You are generating a DEMO preview for outreach, from the
property's real photos, which are attached.

Output ONE complete, self-contained index.html (inline <style> and <script>, Google Fonts
via <link> allowed, no other external files). Language: Romanian, correct diacritics
(ș ț ă â î). It must look like THIS property, derived from its photos, and it must NOT look
like a template.

DERIVE FROM THE PHOTOS: pull the palette (a light base, a deep anchor, one accent) and the
type mood from what you actually see in the images. State nothing you cannot see.

DO NOT MAKE THE SAME SITE TWICE. The banned default skeleton is: full-bleed hero photo with
the name overlaid, then 3 equal room cards, then a dark facilities band of chips, then a
1-big-2-small bento gallery, then a split "De ce" section, then a map card. If your page is
becoming that, recompose. Vary the HERO (full-bleed / split / type-led on a colour field /
offset collage / quiet centred) and the ROOMS treatment (zigzag / horizontal scroll / one
featured + list / asymmetric bento / table) so this site does not match the last one.

ANTI-SLOP: no em-dash or en-dash anywhere (use a period, comma, or hyphen). No Inter/Roboto
for display type. No pure #000 or #fff. No purple/teal AI gradients. One accent colour,
locked. Real inline SVG line icons, one stroke width, never emoji. Sentence case, active
voice, no filler words. Mobile-first, 360px with no horizontal scroll, AA contrast, visible
focus, alt text, prefers-reduced-motion honoured.

MANDATORY (Romania): a footer with "Site demonstrativ realizat de Cadru", the ANPC links
SAL (https://anpc.ro/ce-este-sal/) and SOL (https://ec.europa.eu/consumers/odr), and a
small cookie-consent banner (Accept / Refuz, remembered in localStorage). Contact actions
use tel: and https://wa.me/<number> when a number is given, else omit the button (never a
dead link). Mark clearly that tariffs and details are orientative for the demo.

Return EXACTLY this, nothing else:
===INDEX_HTML===
<the full html document>
===END_HTML===
===RATIONALE===
<3 to 4 lines: which palette and fonts you chose and which photo each came from, plus the
one structural choice that makes this site specific to this property>
===END===`;

async function toDataUrl(url, maxBytes = MAX_IMAGE_BYTES) {
  const res = await fetchRetry(url, { headers: { "User-Agent": "cadru-scanner/0.1" } }, { retries: 1, timeout: 30000 });
  if (!res.ok) return null;
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (!ct.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > maxBytes) return null;
  return `data:${ct};base64,${buf.toString("base64")}`;
}

export async function generateSite({ place, images = [], screenshot = null, source = null }, { openaiKey, model, openaiBase } = {}) {
  if (!openaiKey) throw new Error("An API key is required to generate a site.");
  model = model || process.env.OPENAI_MODEL || "gpt-4o";
  // Resolve the endpoint from the base override, else env, else the key/model shape:
  //   nvapi-... key -> NVIDIA NIM (integrate.api.nvidia.com)
  //   sk-or-... key -> OpenRouter
  //   vendor/model  -> OpenRouter (NVIDIA and OpenRouter both use slash slugs, so
  //                    the key prefix decides first)
  //   otherwise     -> OpenAI
  const detected = openaiKey.startsWith("nvapi-") ? "https://integrate.api.nvidia.com/v1"
    : openaiKey.startsWith("sk-or") ? "https://openrouter.ai/api/v1"
    : model.includes("/") ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1";
  const base = (openaiBase || process.env.OPENAI_BASE || detected).replace(/\/+$/, "");

  // Build the image blocks (real photos first, screenshot as backstop). NVIDIA's
  // OpenAI-compatible endpoint caps inline base64 images at ~180KB each, so skip
  // anything larger when routing there instead of getting a hard error.
  const perImageCap = base.includes("nvidia") ? 180 * 1024 : MAX_IMAGE_BYTES;
  const candidateUrls = [...images];
  if (screenshot) candidateUrls.push(screenshot);
  const dataUrls = [];
  for (const u of candidateUrls) {
    if (dataUrls.length >= MAX_IMAGES) break;
    try { const d = await toDataUrl(u, perImageCap); if (d) dataUrls.push(d); } catch { /* skip bad image */ }
  }
  if (!dataUrls.length) throw new Error("Could not download any usable photo for this property, so there is nothing to derive a theme from.");

  const facts = [
    `Nume: ${place.name}`,
    place.type && `Tip: ${place.type}`,
    (place.town || place.county) && `Localitate: ${[place.town, place.county].filter(Boolean).join(", ")}`,
    place.address && `Adresă: ${place.address}`,
    place.phone && `Telefon: ${place.phone}`,
    place.phone && `WhatsApp (dacă e mobil): ${place.phone.replace(/[^0-9]/g, "")}`,
    place.mapsUrl && `Google Maps: ${place.mapsUrl}`,
    source && `Sursă foto: ${source}`,
    `Rețineți: acesta este un site DEMONSTRATIV. Tarifele și detaliile sunt orientative.`,
  ].filter(Boolean).join("\n");

  const userContent = [
    { type: "text", text: `Construiește site-ul demonstrativ pentru această proprietate.\n\n${facts}\n\nFotografiile reale sunt atașate mai jos. Derivă tema din ele.` },
    ...dataUrls.map((url) => ({ type: "image_url", image_url: { url, detail: "auto" } })),
  ];

  const body = {
    model,
    max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 16000),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
  };
  if (process.env.OPENAI_TEMPERATURE) body.temperature = Number(process.env.OPENAI_TEMPERATURE);

  let json;
  try {
    json = await fetchJson(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
        "HTTP-Referer": "http://localhost:5173", // OpenRouter likes these; OpenAI ignores them
        "X-Title": "Cadru Scanner",
      },
      body: JSON.stringify(body),
    }, { retries: 1, timeout: 240000 });
  } catch (e) {
    if (e.status === 401) {
      const prov = base.includes("nvidia") ? { name: "NVIDIA", key: "nvapi-..." }
        : base.includes("openrouter") ? { name: "OpenRouter", key: "sk-or-..." }
        : { name: "OpenAI", key: "sk-..." };
      throw new Error(`401 (autentificare) de la ${prov.name}. Cheia trebuie să fie una ${prov.name} (${prov.key}) și să se potrivească cu modelul "${model}".`);
    }
    throw new Error(`${e.message} [endpoint=${base}, model=${model}]`);
  }

  const content = json.choices?.[0]?.message?.content || "";
  const { html, rationale } = parseOutput(content);
  if (!html) throw new Error("The model did not return an HTML document. Try again, or a stronger model.");

  const dir = path.join(OUTPUT_DIR, slugify(place.county), slugify(place.name));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify({
    place, source, photoCount: dataUrls.length, model, rationale,
    generatedAt: new Date().toISOString(),
    note: "Demo preview generated from the property's own photos for outreach. Get the owner's consent and real photos before any public deploy.",
  }, null, 2));

  const demoUrl = `/demos/${slugify(place.county)}/${slugify(place.name)}/`;
  return { demoUrl, dir, rationale, photoCount: dataUrls.length, model, source };
}

export function parseOutput(content) {
  let html = "";
  const m = content.match(/===INDEX_HTML===\s*([\s\S]*?)\s*===END_HTML===/);
  if (m) html = m[1].trim();
  if (!html) {
    const fence = content.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (fence && /<html|<!doctype/i.test(fence[1])) html = fence[1].trim();
  }
  if (!html && /<!doctype|<html/i.test(content)) html = content.trim();
  // strip a stray leading fence if the model wrapped the whole thing
  html = html.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

  let rationale = "";
  const r = content.match(/===RATIONALE===\s*([\s\S]*?)\s*(?:===END===|$)/);
  if (r) rationale = r[1].trim();
  return { html, rationale };
}
