import { applyCase, type SlideStyle } from "./spec";

// TikTok photo mode is 9:16. Slides are drawn in these logical units; scale
// the context to render smaller previews.
export const SLIDE_W = 1080;
export const SLIDE_H = 1920;

export type Fonts = Record<SlideStyle["font"], string>;

export type SlideSpec = {
  text: string;
  index: number;
  total: number;
  style: SlideStyle;
  image?: CanvasImageSource & { width: number; height: number };
  fonts: Fonts;
};

// Greedy word wrap that keeps explicit line breaks and splits words longer
// than a whole line.
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      while (measure(word) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut)) > maxWidth) cut--;
        if (line) lines.push(line);
        lines.push(word.slice(0, cut));
        line = "";
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Largest font size (stepping down) whose wrapped text fits the box.
export function fitText(
  measureAt: (size: number) => (s: string) => number,
  text: string,
  box: { width: number; height: number },
  sizes: { max: number; min: number; lineHeight: number },
): { size: number; lines: string[] } {
  for (let size = sizes.max; size >= sizes.min; size -= 4) {
    const lines = wrapText(measureAt(size), text, box.width);
    if (lines.length * size * sizes.lineHeight <= box.height) return { size, lines };
  }
  return { size: sizes.min, lines: wrapText(measureAt(sizes.min), text, box.width) };
}

const WEIGHT: Record<SlideStyle["font"], number> = {
  "sans-bold": 800,
  "sans-regular": 500,
  serif: 600,
  handwritten: 600,
  typewriter: 400,
};

const MAX_SIZE: Record<SlideStyle["size"], number> = { small: 56, medium: 72, large: 96 };

function drawBackground(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  const { style, image } = spec;
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  if (style.background === "photo" && image) {
    const scale = Math.max(SLIDE_W / image.width, SLIDE_H / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (SLIDE_W - w) / 2, (SLIDE_H - h) / 2, w, h);
  } else if (style.background === "gradient" || (style.background === "photo" && !image)) {
    // A photo format without a photo yet falls back to a gradient in its colour.
    const g = ctx.createLinearGradient(0, 0, SLIDE_W, SLIDE_H);
    g.addColorStop(0, style.backgroundColor);
    g.addColorStop(1, "#8d99ae");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  }

  if (style.darken > 0 && style.background !== "notes") {
    ctx.fillStyle = `rgba(0,0,0,${style.darken})`;
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  }
}

function drawNotesChrome(ctx: CanvasRenderingContext2D, fonts: Fonts) {
  ctx.fillStyle = "#e0a800";
  ctx.font = `500 44px ${fonts["sans-regular"]}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText("‹ Notes", 48, 150);
  ctx.textAlign = "right";
  ctx.fillText("Done", SLIDE_W - 48, 150);
}

export function renderSlide(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  const { style, fonts } = spec;
  ctx.save();
  drawBackground(ctx, spec);
  const notes = style.textStyle === "notes" || style.background === "notes";
  if (notes) drawNotesChrome(ctx, fonts);

  const family = fonts[style.font];
  const weight = spec.index === 0 && style.font === "sans-regular" ? 700 : WEIGHT[style.font];
  const text = applyCase(spec.text, style.textCase);
  const boxed = style.textStyle === "caption-box";
  const lineHeight = boxed ? 1.45 : 1.25;
  const margin = style.align === "left" ? 80 : 100;
  const width = SLIDE_W - margin * 2 - (boxed ? 60 : 0);
  const maxSize = MAX_SIZE[style.size] + (spec.index === 0 ? 12 : 0);
  const area = { width, height: notes ? 1400 : 1100 };

  const { size, lines } = fitText(
    (s) => {
      ctx.font = `${weight} ${s}px ${family}`;
      return (t: string) => ctx.measureText(t).width;
    },
    text,
    area,
    { max: maxSize, min: 32, lineHeight },
  );
  ctx.font = `${weight} ${size}px ${family}`;
  const lineH = size * lineHeight;
  const blockH = lines.length * lineH;
  const top = notes
    ? 300
    : style.position === "top"
      ? 260
      : style.position === "bottom"
        ? SLIDE_H - 300 - blockH
        : (SLIDE_H - blockH) / 2;
  const x = style.align === "left" ? margin : SLIDE_W / 2;

  ctx.textAlign = style.align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  lines.forEach((line, i) => {
    if (!line) return;
    const y = top + i * lineH + lineH / 2;
    if (boxed) {
      const w = ctx.measureText(line).width + size * 0.8;
      const left = style.align === "left" ? x - size * 0.4 : x - w / 2;
      ctx.fillStyle = style.boxColor;
      ctx.beginPath();
      ctx.roundRect(left, y - size * 0.72, w, size * 1.44, size * 0.28);
      ctx.fill();
    }
    if (style.textStyle === "outline") {
      ctx.lineWidth = size * 0.14;
      ctx.strokeStyle = style.boxColor;
      ctx.strokeText(line, x, y);
    }
    if (style.textStyle === "shadow") {
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = size * 0.25;
      ctx.shadowOffsetY = size * 0.05;
    }
    ctx.fillStyle = style.textColor;
    ctx.fillText(line, x, y + (boxed ? size * 0.04 : 0));
    ctx.shadowColor = "transparent";
  });

  ctx.restore();
}
