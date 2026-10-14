import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_FILES, styleSamples } from "./samples";
import { STYLES } from "./styles";

describe("era samples", () => {
  it("every listed example portrait is in public/styles", () => {
    for (const id of SAMPLE_FILES) expect(existsSync(path.join(process.cwd(), "public", "styles", `${id}.jpg`)), id).toBe(true);
  });

  it("covers every era", () => {
    const samples = styleSamples();
    for (const s of STYLES) expect(samples[s.id], s.id).toBe(`/styles/${s.id}.jpg`);
  });
});
