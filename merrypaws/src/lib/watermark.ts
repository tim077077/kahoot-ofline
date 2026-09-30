import sharp from "sharp";

const PREVIEW_EDGE = 640;

// A paw print drawn with shapes, not text: server fonts vary between hosts,
// shapes render the same everywhere.
function paw(x: number, y: number, s: number) {
  return `
    <g transform="translate(${x} ${y}) rotate(-20) scale(${s})">
      <ellipse cx="0" cy="14" rx="15" ry="12"/>
      <ellipse cx="-16" cy="-6" rx="6" ry="8"/>
      <ellipse cx="-6" cy="-16" rx="6" ry="8"/>
      <ellipse cx="6" cy="-16" rx="6" ry="8"/>
      <ellipse cx="16" cy="-6" rx="6" ry="8"/>
    </g>`;
}

function overlaySvg(width: number, height: number) {
  // Sparse and soft: enough that nobody prints the preview, light enough that
  // a shared preview still looks like a portrait. The 640px size does the
  // rest of the protecting.
  const step = 210;
  const paws: string[] = [];
  for (let y = step * 0.4, row = 0; y < height + step; y += step * 0.8, row++) {
    for (let x = row % 2 ? step / 2 : step * 0.15; x < width + step; x += step) paws.push(paw(x, y, 1.25));
  }
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <g fill="white" fill-opacity="0.3" stroke="black" stroke-opacity="0.1" stroke-width="1.5">${paws.join("")}</g>
    </svg>`);
}

// Small, watermarked JPEG. This is all a visitor sees before paying; the
// full-resolution image never leaves the server until the portrait is unlocked.
export async function makePreview(full: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(full)
    .rotate()
    .resize({ width: PREVIEW_EDGE, height: PREVIEW_EDGE, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  return sharp(data)
    .composite([{ input: overlaySvg(info.width, info.height), top: 0, left: 0 }])
    .jpeg({ quality: 72 })
    .toBuffer();
}
