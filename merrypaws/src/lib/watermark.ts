import { decode as decodePng } from "fast-png";
import * as jpeg from "jpeg-js";
import type { ImagesBinding } from "@cloudflare/workers-types/experimental/index.ts";
import { TILE_PNG_BASE64 } from "./watermarkTile";

// The watermarked preview: shrunk to 640px and covered in a repeating paw
// tile. On Cloudflare it's made by the Images binding, outside the Worker's
// CPU budget (the free plan allows 10 ms a request; doing it in JavaScript
// takes about 200 ms). Locally and in tests the same tile is drawn in plain
// JavaScript, so both look the same.

const PREVIEW_EDGE = 640;

type Rgba = { width: number; height: number; data: Uint8ClampedArray };

export class UnsupportedImageError extends Error {}

function decode(bytes: Uint8Array): Rgba {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 40, maxMemoryUsageInMB: 256 });
    return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length) };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const png = decodePng(bytes);
    if (png.palette || png.depth !== 8) throw new UnsupportedImageError("Only 8-bit RGB(A) PNGs are supported");
    const out = new Uint8ClampedArray(png.width * png.height * 4);
    const c = png.channels;
    for (let i = 0, j = 0; i < out.length; i += 4, j += c) {
      out[i] = png.data[j];
      out[i + 1] = png.data[c >= 3 ? j + 1 : j];
      out[i + 2] = png.data[c >= 3 ? j + 2 : j];
      out[i + 3] = 255;
    }
    return { width: png.width, height: png.height, data: out };
  }
  throw new UnsupportedImageError("Only JPEG and PNG images are supported");
}

// Box filter: each output pixel averages the input pixels it covers. Sharp
// enough for a preview, and never enlarges.
function shrink(img: Rgba, edge: number): Rgba {
  const scale = Math.min(1, edge / Math.max(img.width, img.height));
  if (scale === 1) return img;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * img.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * img.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * img.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * img.width) / width));
      let r = 0, g = 0, b = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * img.width + sx) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
        }
      }
      const n = (y1 - y0) * (x1 - x0);
      const o = (y * width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { width, height, data: out };
}

let tile: Rgba | null = null;
function pawTile(): Rgba {
  if (!tile) {
    const png = decodePng(Buffer.from(TILE_PNG_BASE64, "base64"));
    tile = { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  return tile;
}

// The tile repeated from the top-left corner, blended "over" the image.
function overlay(img: Rgba) {
  const t = pawTile();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const j = ((y % t.height) * t.width + (x % t.width)) * 4;
      const alpha = t.data[j + 3] / 255;
      if (alpha === 0) continue;
      const i = (y * img.width + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = img.data[i + k] * (1 - alpha) + t.data[j + k] * alpha;
    }
  }
}

// The Workers and DOM ReadableStream types differ only on paper.
type ImageStream = Parameters<ImagesBinding["input"]>[0];
const stream = (bytes: Uint8Array) => new Blob([bytes as BlobPart]).stream() as unknown as ImageStream;

// Cloudflare's Images binding, when running on Cloudflare.
async function imagesBinding(): Promise<ImagesBinding | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return getCloudflareContext().env.IMAGES;
  } catch {
    return undefined;
  }
}

async function previewWithImages(images: ImagesBinding, full: Uint8Array, paws: boolean): Promise<Buffer> {
  const sized = images.input(stream(full)).transform({ width: PREVIEW_EDGE, height: PREVIEW_EDGE, fit: "scale-down" });
  const result = await (paws ? sized.draw(stream(Buffer.from(TILE_PNG_BASE64, "base64")), { repeat: true, top: 0, left: 0 }) : sized).output({
    format: "image/jpeg",
    quality: 72,
  });
  return Buffer.from(await result.response().arrayBuffer());
}

function previewInJs(full: Uint8Array, paws: boolean): Buffer {
  const small = shrink(decode(full), PREVIEW_EDGE);
  if (paws) overlay(small);
  return Buffer.from(jpeg.encode({ width: small.width, height: small.height, data: small.data }, 72).data);
}

// Small, watermarked JPEG. This is all a visitor sees before paying; the
// full-resolution image never leaves the server until the portrait is unlocked.
// WATERMARK_ENGINE=js skips the Images binding (needs Workers Paid for the CPU
// time). Wrangler's local Images stand-in ignores draw(), so check the paws
// on the first real deploy. Without paws (the owner, or free testing) it's
// the same small JPEG, clean.
export async function makePreview(full: Uint8Array, paws = true): Promise<Buffer> {
  const images = process.env.WATERMARK_ENGINE === "js" ? undefined : await imagesBinding();
  return images ? previewWithImages(images, full, paws) : previewInJs(full, paws);
}
