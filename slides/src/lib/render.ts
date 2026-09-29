import type { ThemeId } from "./templates";

// TikTok photo mode is 9:16. Slides are drawn in these logical units; scale
// the context to render smaller previews.
export const SLIDE_W = 1080;
export const SLIDE_H = 1920;

export type Fonts = { sans: string; serif: string };

export type SlideSpec = {
  text: string;
  index: number;
  total: number;
  theme: ThemeId;
  image?: CanvasImageSource & { width: number; height: number };
  fonts: Fonts;
  watermark?: string;
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

function drawCover(ctx: CanvasRenderingContext2D, image: NonNullable<SlideSpec["image"]>) {
  const scale = Math.max(SLIDE_W / image.width, SLIDE_H / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (SLIDE_W - w) / 2, (SLIDE_H - h) / 2, w, h);
}

function fillGradient(ctx: CanvasRenderingContext2D, from: string, to: string) {
  const g = ctx.createLinearGradient(0, 0, SLIDE_W, SLIDE_H);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
}

function measurer(ctx: CanvasRenderingContext2D, weight: number, family: string) {
  return (size: number) => {
    ctx.font = `${weight} ${size}px ${family}`;
    return (s: string) => ctx.measureText(s).width;
  };
}

// TikTok's native text style: each line on its own white rounded box.
function drawCaption(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  if (spec.image) drawCover(ctx, spec.image);
  else fillGradient(ctx, "#2b2d42", "#8d99ae");

  const family = spec.fonts.sans;
  const { size, lines } = fitText(measurer(ctx, 700, family), spec.text, { width: 860, height: 1000 }, {
    max: spec.index === 0 ? 76 : 64,
    min: 36,
    lineHeight: 1.45,
  });
  ctx.font = `700 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineH = size * 1.45;
  const top = SLIDE_H * 0.42 - (lines.length * lineH) / 2;
  lines.forEach((line, i) => {
    if (!line) return;
    const y = top + i * lineH + lineH / 2;
    const w = ctx.measureText(line).width + size * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(SLIDE_W / 2 - w / 2, y - size * 0.72, w, size * 1.44, size * 0.28);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillText(line, SLIDE_W / 2, y + size * 0.04);
  });
}

// Big white text with a black outline over a darkened background.
function drawBold(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  if (spec.image) {
    drawCover(ctx, spec.image);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  } else fillGradient(ctx, "#0b0b0f", "#2a1b3d");

  const family = spec.fonts.sans;
  const { size, lines } = fitText(measurer(ctx, 800, family), spec.text, { width: 900, height: 1200 }, {
    max: spec.index === 0 ? 104 : 84,
    min: 44,
    lineHeight: 1.2,
  });
  ctx.font = `800 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lineH = size * 1.2;
  const top = SLIDE_H / 2 - (lines.length * lineH) / 2;
  lines.forEach((line, i) => {
    const y = top + i * lineH + lineH / 2;
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(line, SLIDE_W / 2, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, SLIDE_W / 2, y);
  });
}

// Looks like a screenshot of the iPhone Notes app.
function drawNotes(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  const family = spec.fonts.sans;

  ctx.fillStyle = "#e0a800";
  ctx.font = `500 44px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("‹ Notes", 48, 150);
  ctx.textAlign = "right";
  ctx.fillText("Done", SLIDE_W - 48, 150);

  ctx.fillStyle = "#8e8e93";
  ctx.font = `400 34px ${family}`;
  ctx.textAlign = "center";
  ctx.fillText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), SLIDE_W / 2, 250);

  const { size, lines } = fitText(measurer(ctx, spec.index === 0 ? 700 : 400, family), spec.text, { width: 960, height: 1400 }, {
    max: spec.index === 0 ? 72 : 58,
    min: 34,
    lineHeight: 1.35,
  });
  ctx.fillStyle = "#1c1c1e";
  ctx.font = `${spec.index === 0 ? 700 : 400} ${size}px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, 60, 340 + i * size * 1.35));
}

// Clean editorial look: cream paper, serif type, slide counter.
function drawMinimal(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  let textTop = 360;
  if (spec.image) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(90, 300, SLIDE_W - 180, 760, 36);
    ctx.clip();
    const scale = Math.max((SLIDE_W - 180) / spec.image.width, 760 / spec.image.height);
    const w = spec.image.width * scale;
    const h = spec.image.height * scale;
    ctx.drawImage(spec.image, 90 + (SLIDE_W - 180 - w) / 2, 300 + (760 - h) / 2, w, h);
    ctx.restore();
    textTop = 1140;
  }

  ctx.fillStyle = "#8a7f72";
  ctx.font = `500 36px ${spec.fonts.sans}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${String(spec.index + 1).padStart(2, "0")} / ${String(spec.total).padStart(2, "0")}`, 90, 220);

  const family = spec.fonts.serif;
  const { size, lines } = fitText(measurer(ctx, 600, family), spec.text, { width: 900, height: SLIDE_H - textTop - 220 }, {
    max: spec.index === 0 ? 96 : 76,
    min: 40,
    lineHeight: 1.2,
  });
  ctx.fillStyle = "#1f1a17";
  ctx.font = `600 ${size}px ${family}`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, 90, textTop + i * size * 1.2));
}

const THEMES: Record<ThemeId, (ctx: CanvasRenderingContext2D, spec: SlideSpec) => void> = {
  caption: drawCaption,
  bold: drawBold,
  notes: drawNotes,
  minimal: drawMinimal,
};

export function renderSlide(ctx: CanvasRenderingContext2D, spec: SlideSpec) {
  ctx.save();
  THEMES[spec.theme](ctx, spec);
  if (spec.watermark) {
    ctx.font = `600 30px ${spec.fonts.sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = spec.theme === "notes" || spec.theme === "minimal" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)";
    ctx.fillText(spec.watermark, SLIDE_W / 2, SLIDE_H - 90);
  }
  ctx.restore();
}
