// Browser-only helpers for the studio.

import type { Fonts } from "./render";

// Canvas can only draw a web font after it has loaded; next/font exposes the
// real family names through CSS variables on <html>.
export async function loadFonts(): Promise<Fonts> {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const fonts: Fonts = {
    "sans-bold": read("--font-montserrat", "sans-serif"),
    "sans-regular": read("--font-montserrat", "sans-serif"),
    serif: read("--font-fraunces", "serif"),
    handwritten: read("--font-caveat", "cursive"),
    typewriter: read("--font-courier", "monospace"),
  };
  await Promise.all([
    document.fonts.load(`800 64px ${fonts["sans-bold"]}`),
    document.fonts.load(`500 64px ${fonts["sans-regular"]}`),
    document.fonts.load(`700 64px ${fonts["sans-regular"]}`),
    document.fonts.load(`600 64px ${fonts.serif}`),
    document.fonts.load(`600 64px ${fonts.handwritten}`),
    document.fonts.load(`400 64px ${fonts.typewriter}`),
  ]).catch(() => undefined);
  return fonts;
}

// Screenshots are resized before upload: smaller requests, and the model
// reads layouts just as well at this size.
export async function shrinkImage(file: File, maxEdge = 1568): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToBlob(canvas, "image/jpeg", 0.9);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality),
  );
}

export function download(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: the library just won't persist.
  }
}
