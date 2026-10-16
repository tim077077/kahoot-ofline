"use client";

import { instagramStory, nativeShare } from "./native";
import { BRAND } from "./config";

// Share cards: the portrait as a print on cream paper with its title and a
// small "made with" mark. The output is the marketing, so it has to look like
// something people want on their story.

export type ShareFormat = "story" | "post";

const SIZES: Record<ShareFormat, { w: number; h: number; print: number; top: number }> = {
  story: { w: 1080, h: 1920, print: 800, top: 260 },
  post: { w: 1080, h: 1350, print: 640, top: 90 },
};

const PAPER = "#f5eee3";
const INK = "#2a1b14";
const MUTED = "#6e5646";

function family(varName: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

export type CardText = { name: string; title: string; year: number; memorial?: boolean };

// The words drawn onto cards, in the reader's language (src/i18n/app.ts
// builds these from the catalog). English by default.
export type CardWords = {
  memorial: string;
  titleCard: (title: string, year: number) => string;
  madeWith: string;
  rollDay: (n: number) => string;
  starring: (name: string) => string;
};

export const ENGLISH_CARD_WORDS: CardWords = {
  memorial: "In loving memory of",
  titleCard: (title, year) => `in ${title}, ${year}`,
  madeWith: `MADE WITH ${BRAND.toUpperCase()}`,
  rollDay: (n) => `day ${n} of the photo-a-day roll`,
  starring: (name) => `starring ${name}`,
};

export async function makeShareCard(src: string, text: CardText, format: ShareFormat, words = ENGLISH_CARD_WORDS): Promise<Blob> {
  const size = SIZES[format];
  const display = family("--font-bodoni", "serif");
  const script = family("--font-pinyon", "cursive");
  const sans = family("--font-jost", "sans-serif");
  await Promise.all([
    document.fonts.load(`italic 48px ${display}`),
    document.fonts.load(`48px ${display}`),
    document.fonts.load(`96px ${script}`),
    document.fonts.load(`28px ${sans}`),
  ]).catch(() => {});
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size.w, size.h);

  // The print: the image at the print width, in a paper mount with a shadow.
  const pw = size.print;
  const ph = Math.round((pw * img.height) / img.width);
  const maxH = format === "story" ? 1060 : 820;
  const scale = Math.min(1, maxH / ph);
  const w = Math.round(pw * scale);
  const h = Math.round(ph * scale);
  const x = Math.round((size.w - w) / 2);
  const y = size.top;
  const pad = 22;
  ctx.save();
  ctx.shadowColor = "rgba(58, 34, 20, 0.28)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#fbf7f0";
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2 + 8);
  ctx.restore();
  ctx.drawImage(img, x, y, w, h);

  // The title card under the print.
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  let ty = y + h + pad + (format === "story" ? 130 : 96);
  if (text.memorial) {
    ctx.font = `italic 40px ${display}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(words.memorial, size.w / 2, ty - (format === "story" ? 92 : 78));
    ctx.fillStyle = INK;
  }
  ctx.font = `${format === "story" ? 124 : 104}px ${script}`;
  ctx.fillText(text.name, size.w / 2, ty);
  ty += format === "story" ? 84 : 68;
  ctx.font = `italic ${format === "story" ? 50 : 42}px ${display}`;
  ctx.fillText(words.titleCard(text.title, text.year), size.w / 2, ty);

  // The small mark.
  ctx.font = `500 26px ${sans}`;
  ctx.fillStyle = MUTED;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText(words.madeWith, size.w / 2, size.h - (format === "story" ? 120 : 56));

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.92),
  );
}

// A single photo as an Instagram story: a taped print on cream paper with its
// date stamp and caption. The top and bottom 250px stay clear for Instagram's
// own buttons.
export async function makePhotoStoryCard(
  src: string,
  text: { name: string; caption?: string; date: string; filter: string; roll?: number },
  words = ENGLISH_CARD_WORDS,
): Promise<Blob> {
  const display = family("--font-bodoni", "serif");
  const script = family("--font-pinyon", "cursive");
  const hand = family("--font-hand", "cursive");
  const sans = family("--font-jost", "sans-serif");
  await Promise.all([
    document.fonts.load(`110px ${script}`),
    document.fonts.load(`italic 38px ${display}`),
    document.fonts.load(`40px ${hand}`),
    document.fonts.load(`600 30px ${sans}`),
  ]).catch(() => {});
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1920);

  // The print, a little crooked, taped at the top.
  const w = 800;
  const h = Math.min(1000, Math.round((w * img.height) / img.width));
  const pad = 30;
  ctx.save();
  ctx.translate(540, 300 + h / 2);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.shadowColor = "rgba(58, 34, 20, 0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2 + 90);
  ctx.shadowColor = "transparent";
  ctx.shadowOffsetY = 0;
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.filter = text.filter;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -w / 2, -h / 2, w, h);
  ctx.filter = "none";
  const d = new Date(text.date);
  ctx.font = `600 30px ${sans}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff9a3c";
  ctx.shadowColor = "rgba(255, 110, 20, 0.8)";
  ctx.shadowBlur = 8;
  ctx.fillText(`'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`, w / 2 - 22, h / 2 - 22);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  if (text.caption) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#3a2a20";
    ctx.font = `40px ${hand}`;
    ctx.fillText(text.caption.slice(0, 34), 0, h / 2 + 70);
  }
  ctx.fillStyle = "rgba(226, 208, 168, 0.88)";
  ctx.rotate((5 * Math.PI) / 180);
  ctx.fillRect(-90, -h / 2 - pad - 26, 180, 52);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `120px ${script}`;
  const nameY = Math.min(1540, 300 + h + 250);
  ctx.fillText(text.name, 540, nameY);
  if (text.roll) {
    ctx.font = `italic 38px ${display}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(words.rollDay(text.roll), 540, nameY + 64);
  }
  ctx.font = `500 26px ${sans}`;
  ctx.fillStyle = MUTED;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText(words.madeWith, 540, 1690);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.92),
  );
}

// Straight into Instagram Stories. In the apps a small native plugin
// (InstagramStoriesPlugin in android/ and ios/, see docs/INSTAGRAM.md) opens
// Instagram's story composer with the card already on the canvas. Without
// Instagram, without a Meta App ID, or on the web (Instagram allows no such
// link there), the share sheet opens with the image and Instagram is one tap
// away.
export async function shareToInstagramStory(blob: Blob, title: string) {
  if ((await instagramStory(blob, process.env.NEXT_PUBLIC_META_APP_ID).catch(() => "unavailable")) === "shared") return "shared" as const;
  return shareOrSave(blob, "story.jpg", title);
}

// Native share sheet with the file when the platform supports it, otherwise
// a download.
export async function shareOrSave(blob: Blob, filename: string, title: string) {
  const native = await nativeShare(blob, filename, title).catch(() => "web" as const);
  if (native !== "web") return native;
  const file = new File([blob], filename, { type: blob.type });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return "shared" as const;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "saved" as const;
}

// A scrapbook page for stories: up to five prints, taped down at angles, with
// the highlight's title in script.
const COLLAGE_SLOTS = [
  { x: 90, y: 330, w: 520, h: 640, r: -4 },
  { x: 560, y: 380, w: 430, h: 520, r: 5 },
  { x: 110, y: 1000, w: 440, h: 540, r: 3 },
  { x: 540, y: 930, w: 450, h: 560, r: -3 },
  { x: 330, y: 1330, w: 420, h: 330, r: -1 },
];

export async function makeCollageCard(
  photos: { src: string; date: string }[],
  text: { title: string; name: string; filter: string },
  words = ENGLISH_CARD_WORDS,
): Promise<Blob> {
  const display = family("--font-bodoni", "serif");
  const script = family("--font-pinyon", "cursive");
  const hand = family("--font-hand", "cursive");
  const sans = family("--font-jost", "sans-serif");
  await Promise.all([
    document.fonts.load(`110px ${script}`),
    document.fonts.load(`italic 40px ${display}`),
    document.fonts.load(`28px ${hand}`),
    document.fonts.load(`600 26px ${sans}`),
  ]).catch(() => {});
  const images = await Promise.all(photos.map((p) => loadImage(p.src)));

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `130px ${script}`;
  ctx.fillText(text.title, 540, 190);
  ctx.font = `italic 40px ${display}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(words.starring(text.name), 540, 262);

  images.forEach((img, i) => {
    const slot = COLLAGE_SLOTS[i];
    const pad = 22;
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate((slot.r * Math.PI) / 180);
    ctx.shadowColor = "rgba(58, 34, 20, 0.3)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#fbf8f2";
    ctx.fillRect(-slot.w / 2 - pad, -slot.h / 2 - pad, slot.w + pad * 2, slot.h + pad * 2);
    ctx.shadowColor = "transparent";
    // Cover-crop the photo into its slot, through the album's film look.
    const scale = Math.max(slot.w / img.width, slot.h / img.height);
    const sw = slot.w / scale;
    const sh = slot.h / scale;
    ctx.filter = text.filter;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -slot.w / 2, -slot.h / 2, slot.w, slot.h);
    ctx.filter = "none";
    // The date stamp, burned into the corner.
    const d = new Date(photos[i].date);
    ctx.font = `600 26px ${sans}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#ff9a3c";
    ctx.shadowColor = "rgba(255, 110, 20, 0.8)";
    ctx.shadowBlur = 8;
    ctx.fillText(`'${String(d.getFullYear()).slice(2)} ${d.getMonth() + 1} ${d.getDate()}`, slot.w / 2 - 18, slot.h / 2 - 18);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = "transparent";
    // A strip of masking tape across the top edge.
    ctx.fillStyle = "rgba(226, 208, 168, 0.85)";
    ctx.rotate(((i % 2 ? 6 : -6) * Math.PI) / 180);
    ctx.fillRect(-70, -slot.h / 2 - pad - 18, 140, 40);
    ctx.restore();
  });

  ctx.textAlign = "center";
  ctx.font = `500 26px ${sans}`;
  ctx.fillStyle = MUTED;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText(words.madeWith, 540, 1830);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
  );
}
