import { STYLES, type StyleId } from "./styles";

// Example portraits for the era cards, in public/styles/<style-id>.jpg. Listed
// here rather than looked up on disk, because the deployed app (Cloudflare
// Workers) has no filesystem. An era missing from the list falls back to the
// gradient art. samples.test.ts checks every listed file exists.
//
// The current set is one made-up dog in every era, made with the same model
// the app uses. Swap in real customer results (with permission) when you have
// them; keep them 800x1000 JPEGs.
export const SAMPLE_FILES: StyleId[] = ["royal-court", "family-album", "golden-age", "silent-era", "holiday-special", "painted-pet", "your-scene"];

export function styleSamples(): Record<StyleId, string | null> {
  return Object.fromEntries(STYLES.map((s) => [s.id, SAMPLE_FILES.includes(s.id) ? `/styles/${s.id}.jpg` : null])) as Record<StyleId, string | null>;
}
