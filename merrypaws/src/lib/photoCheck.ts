// Cheap checks on the chosen photo, run on the phone before any money is
// spent on generation. Heuristics only: the user can always "use it anyway".

export type PhotoProblem = "small" | "dark" | "blurry";

export type PhotoMetrics = { width: number; height: number; brightness: number; sharpness: number };

// Long edge the photo is scaled to before measuring, so thresholds don't
// depend on the camera's resolution.
export const SAMPLE_EDGE = 256;

const MIN_SHORT_EDGE = 300;
const MIN_BRIGHTNESS = 38;
// Calibrated on real photos: sharp ones score 40-250+, a visible blur under 15.
const MIN_SHARPNESS = 15;

// Mean brightness (0-255) and the variance of the Laplacian, the classic
// focus measure: sharp edges give a wide spread, blur flattens it.
export function measure(gray: Uint8ClampedArray | number[], w: number, h: number) {
  let sum = 0;
  for (let i = 0; i < w * h; i++) sum += gray[i];
  const brightness = sum / (w * h);

  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      n++;
      const d = lap - mean;
      mean += d / n;
      m2 += d * (lap - mean);
    }
  }
  return { brightness, sharpness: n > 1 ? m2 / (n - 1) : 0 };
}

export function judge(m: PhotoMetrics): PhotoProblem | null {
  if (Math.min(m.width, m.height) < MIN_SHORT_EDGE) return "small";
  if (m.brightness < MIN_BRIGHTNESS) return "dark";
  if (m.sharpness < MIN_SHARPNESS) return "blurry";
  return null;
}

export const PROBLEM_TEXT: Record<PhotoProblem, string> = {
  small: "This photo is quite small, so the portrait may come out soft.",
  dark: "This photo is very dark, so their colours and markings may get lost.",
  blurry: "This photo looks blurry, so the portrait may not look like them.",
};

// Browser only: measure a picked image.
export async function checkPhoto(file: Blob): Promise<{ problem: PhotoProblem | null; metrics: PhotoMetrics }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(3, Math.round(bitmap.width * scale));
  const h = Math.max(3, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  const metrics = { width: bitmap.width, height: bitmap.height, ...measure(gray, w, h) };
  bitmap.close();
  return { problem: judge(metrics), metrics };
}
