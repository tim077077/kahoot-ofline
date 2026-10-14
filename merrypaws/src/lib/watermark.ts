import * as jpeg from "jpeg-js";
import { decode as decodePng } from "fast-png";

// Pure JavaScript (no native image library) so previews are made the same way
// on Node and on Cloudflare Workers. A 1K portrait takes a few hundred ms.

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

// A paw print drawn with shapes, not text: fonts vary between hosts, shapes
// render the same everywhere. Pad, then four toes, in paw units.
const PAW = [
  { cx: 0, cy: 14, rx: 15, ry: 12 },
  { cx: -16, cy: -6, rx: 6, ry: 8 },
  { cx: -6, cy: -16, rx: 6, ry: 8 },
  { cx: 6, cy: -16, rx: 6, ry: 8 },
  { cx: 16, cy: -6, rx: 6, ry: 8 },
];

function blend(img: Rgba, i: number, value: number, alpha: number) {
  for (let k = 0; k < 3; k++) img.data[i + k] = img.data[i + k] * (1 - alpha) + value * alpha;
}

function drawPaw(img: Rgba, px: number, py: number, scale: number) {
  const angle = (-20 * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const reach = 34 * scale;
  for (let y = Math.max(0, Math.floor(py - reach)); y < Math.min(img.height, Math.ceil(py + reach)); y++) {
    for (let x = Math.max(0, Math.floor(px - reach)); x < Math.min(img.width, Math.ceil(px + reach)); x++) {
      // Back into paw units: undo the translate, rotate and scale.
      const dx = (x + 0.5 - px) / scale;
      const dy = (y + 0.5 - py) / scale;
      const ux = dx * cos + dy * sin;
      const uy = -dx * sin + dy * cos;
      // Distance to the nearest shape edge, in pixels (negative inside).
      let d = Infinity;
      for (const e of PAW) {
        const v = Math.hypot((ux - e.cx) / e.rx, (uy - e.cy) / e.ry);
        d = Math.min(d, (v - 1) * Math.min(e.rx, e.ry) * scale);
      }
      const i = (y * img.width + x) * 4;
      const fill = Math.min(1, Math.max(0, 0.5 - d));
      if (fill > 0) blend(img, i, 255, 0.3 * fill);
      const edge = Math.min(1, Math.max(0, 1.25 - Math.abs(d)));
      if (edge > 0) blend(img, i, 0, 0.1 * edge);
    }
  }
}

// Sparse and soft: enough that nobody prints the preview, light enough that a
// shared preview still looks like a portrait. The 640px size does the rest.
function overlay(img: Rgba) {
  const step = 210;
  for (let y = step * 0.4, row = 0; y < img.height + step; y += step * 0.8, row++) {
    for (let x = row % 2 ? step / 2 : step * 0.15; x < img.width + step; x += step) drawPaw(img, x, y, 1.25);
  }
}

// Small, watermarked JPEG. This is all a visitor sees before paying; the
// full-resolution image never leaves the server until the portrait is unlocked.
export async function makePreview(full: Uint8Array): Promise<Buffer> {
  const small = shrink(decode(full), PREVIEW_EDGE);
  overlay(small);
  return Buffer.from(jpeg.encode({ width: small.width, height: small.height, data: small.data }, 72).data);
}
