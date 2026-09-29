import { describe, expect, it } from "vitest";
import { applyCase, CURATED_SPECS, sanitizeStyle, SpecSchema } from "./spec";

describe("template specs", () => {
  it("turns every curated template into a valid spec", () => {
    for (const spec of CURATED_SPECS) {
      expect(() => SpecSchema.parse(spec)).not.toThrow();
      expect(spec.exampleSlides.length).toBe(spec.slideCount);
    }
  });

  it("clamps model-provided colours and darkness before they reach the canvas", () => {
    const style = sanitizeStyle({
      ...CURATED_SPECS[0].style,
      textColor: "red; background: url(x)",
      boxColor: "#ABCDEF",
      darken: 7,
    });
    expect(style.textColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(style.boxColor).toBe("#ABCDEF");
    expect(style.darken).toBeLessThanOrEqual(0.85);
    expect(sanitizeStyle({ ...style, darken: Number.NaN }).darken).toBe(0);
  });

  it("applies the format's letter case", () => {
    expect(applyCase("Things Nobody Tells You", "lower")).toBe("things nobody tells you");
    expect(applyCase("pov: you", "upper")).toBe("POV: YOU");
    expect(applyCase("Keep It", "as-written")).toBe("Keep It");
  });
});
