import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { STYLES, type StyleId } from "./styles";

// Drop real example portraits into public/styles/<style-id>.jpg and they show
// up on the landing page and style picker. Until then, cards fall back to a
// gradient so the site never shows a broken image.
export function styleSamples(): Record<StyleId, string | null> {
  const entries = STYLES.map((s) => {
    const file = path.join(process.cwd(), "public", "styles", `${s.id}.jpg`);
    return [s.id, existsSync(file) ? `/styles/${s.id}.jpg` : null] as const;
  });
  return Object.fromEntries(entries) as Record<StyleId, string | null>;
}
