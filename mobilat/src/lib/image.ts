// Browser-only image helpers.

const MAX_EDGE = 1600;

// Downscale big phone photos before upload: faster, cheaper, and well under
// the serverless body limit. createImageBitmap applies EXIF rotation.
export async function prepareUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas, 0.9);
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

// Remote results go through our proxy so the canvas isn't tainted.
export function sameOriginSrc(url: string) {
  return url.startsWith("data:") ? url : `/api/image?url=${encodeURIComponent(url)}`;
}

export async function downloadResult(url: string, filename: string, label?: string) {
  const img = await loadImage(sameOriginSrc(url));
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  if (label) {
    const size = Math.max(14, Math.round(canvas.width * 0.018));
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    const pad = size * 0.6;
    const w = ctx.measureText(label).width + pad * 2;
    const h = size + pad * 1.4;
    const x = canvas.width - w - size;
    const y = canvas.height - h - size;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + pad, y + h / 2);
  }

  const blob = await toBlob(canvas, 0.92);
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
