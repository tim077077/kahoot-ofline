"use client";

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

export async function makeShareCard(src: string, text: CardText, format: ShareFormat): Promise<Blob> {
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
    ctx.fillText("In loving memory of", size.w / 2, ty - (format === "story" ? 92 : 78));
    ctx.fillStyle = INK;
  }
  ctx.font = `${format === "story" ? 124 : 104}px ${script}`;
  ctx.fillText(text.name, size.w / 2, ty);
  ty += format === "story" ? 84 : 68;
  ctx.font = `italic ${format === "story" ? 50 : 42}px ${display}`;
  ctx.fillText(`in ${text.title}, ${text.year}`, size.w / 2, ty);

  // The small mark.
  ctx.font = `500 26px ${sans}`;
  ctx.fillStyle = MUTED;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText(`MADE WITH ${BRAND.toUpperCase()}`, size.w / 2, size.h - (format === "story" ? 120 : 56));

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.92),
  );
}

// Native share sheet with the file when the platform supports it, otherwise
// a download.
export async function shareOrSave(blob: Blob, filename: string, title: string) {
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
