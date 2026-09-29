import { z } from "zod";
import { byHeat, type Template, type ThemeId } from "./templates";

// A template is a *spec*: how the slides look and how the writing works.
// Curated templates ship with the app; copied templates come from screenshots
// of real viral slideshows, read by Claude.

export const StyleSchema = z.object({
  // Where the text block sits on the slide.
  position: z.enum(["top", "center", "bottom"]),
  align: z.enum(["left", "center"]),
  // caption-box: TikTok's native white box behind each line.
  // outline: white text with a black stroke. shadow: text with a soft shadow.
  // plain: flat text. notes: an iPhone Notes screenshot.
  textStyle: z.enum(["caption-box", "outline", "shadow", "plain", "notes"]),
  font: z.enum(["sans-bold", "sans-regular", "serif", "handwritten", "typewriter"]),
  textCase: z.enum(["as-written", "lower", "upper"]),
  size: z.enum(["small", "medium", "large"]),
  textColor: z.string(),
  boxColor: z.string(),
  background: z.enum(["photo", "solid", "gradient", "notes"]),
  backgroundColor: z.string(),
  // 0 = photo untouched, 1 = black. Keeps text readable over photos.
  darken: z.number(),
});

export type SlideStyle = z.infer<typeof StyleSchema>;

export const SpecSchema = z.object({
  name: z.string(),
  // How the writing works, in words the writer model can follow.
  formula: z.string(),
  slideCount: z.number(),
  style: StyleSchema,
  // The slides' text as seen in the screenshots (or a curated example).
  exampleSlides: z.array(z.string()),
});

export type TemplateSpec = z.infer<typeof SpecSchema> & { id: string; source: "curated" | "copied" };

const BASE: SlideStyle = {
  position: "center",
  align: "center",
  textStyle: "caption-box",
  font: "sans-bold",
  textCase: "as-written",
  size: "medium",
  textColor: "#111111",
  boxColor: "#ffffff",
  background: "gradient",
  backgroundColor: "#2b2d42",
  darken: 0,
};

const THEME_STYLES: Record<ThemeId, SlideStyle> = {
  caption: BASE,
  bold: {
    ...BASE,
    textStyle: "outline",
    size: "large",
    textColor: "#ffffff",
    boxColor: "#000000",
    backgroundColor: "#0b0b0f",
    darken: 0.5,
  },
  notes: {
    ...BASE,
    position: "top",
    align: "left",
    textStyle: "notes",
    font: "sans-regular",
    textCase: "lower",
    textColor: "#1c1c1e",
    background: "notes",
    backgroundColor: "#ffffff",
  },
  minimal: {
    ...BASE,
    position: "center",
    align: "left",
    textStyle: "plain",
    font: "serif",
    size: "large",
    textColor: "#1f1a17",
    background: "solid",
    backgroundColor: "#f4efe6",
  },
};

export function specFromTemplate(t: Template): TemplateSpec {
  return {
    id: t.id,
    source: "curated",
    name: t.name,
    formula: t.structure,
    slideCount: t.slides,
    style: THEME_STYLES[t.theme],
    exampleSlides: t.example.slides,
  };
}

export const CURATED_SPECS: TemplateSpec[] = byHeat().map(specFromTemplate);

const HEX = /^#[0-9a-f]{6}$/i;

// Model output is checked by the schema, but colours and numbers still need
// clamping before they reach the canvas.
export function sanitizeStyle(style: SlideStyle): SlideStyle {
  return {
    ...style,
    textColor: HEX.test(style.textColor) ? style.textColor : BASE.textColor,
    boxColor: HEX.test(style.boxColor) ? style.boxColor : BASE.boxColor,
    backgroundColor: HEX.test(style.backgroundColor) ? style.backgroundColor : BASE.backgroundColor,
    darken: Math.min(0.85, Math.max(0, Number.isFinite(style.darken) ? style.darken : 0)),
  };
}

export function applyCase(text: string, textCase: SlideStyle["textCase"]) {
  if (textCase === "lower") return text.toLowerCase();
  if (textCase === "upper") return text.toUpperCase();
  return text;
}
