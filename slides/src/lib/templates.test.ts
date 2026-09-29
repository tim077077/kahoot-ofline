import { describe, expect, it } from "vitest";
import { byHeat, CATEGORIES, TEMPLATES } from "./templates";

describe("template library", () => {
  it("has unique ids, valid categories and examples that match the slide count", () => {
    const ids = new Set(TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      expect(CATEGORIES).toContain(t.category);
      expect(t.example.slides.length).toBe(t.slides);
      expect(t.heat).toBeGreaterThan(0);
      expect(t.heat).toBeLessThanOrEqual(100);
    }
  });

  it("sorts hottest first without mutating the library", () => {
    const before = TEMPLATES.map((t) => t.id);
    const sorted = byHeat();
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].heat).toBeGreaterThanOrEqual(sorted[i].heat);
    expect(TEMPLATES.map((t) => t.id)).toEqual(before);
  });
});
