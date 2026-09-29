import { describe, expect, it } from "vitest";
import { fitText, wrapText } from "./render";

// Every character is 10px wide at size 20; scales linearly with size.
const measureAt = (size: number) => (s: string) => s.length * (size / 2);
const measure = measureAt(20);

describe("wrapText", () => {
  it("wraps on word boundaries within the width", () => {
    const lines = wrapText(measure, "one two three four five", 100);
    expect(lines).toEqual(["one two", "three four", "five"]);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(100);
  });

  it("keeps explicit line breaks", () => {
    expect(wrapText(measure, "❌ bad\n✅ good", 1000)).toEqual(["❌ bad", "✅ good"]);
  });

  it("splits a word longer than the whole line", () => {
    const lines = wrapText(measure, "supercalifragilistic", 50);
    expect(lines.join("")).toBe("supercalifragilistic");
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(50);
  });
});

describe("fitText", () => {
  it("uses the biggest size that fits and shrinks for long text", () => {
    const short = fitText(measureAt, "Hi", { width: 500, height: 500 }, { max: 80, min: 20, lineHeight: 1.2 });
    expect(short.size).toBe(80);

    const long = fitText(measureAt, "word ".repeat(80), { width: 500, height: 500 }, { max: 80, min: 20, lineHeight: 1.2 });
    expect(long.size).toBeLessThan(80);
    expect(long.lines.length * long.size * 1.2).toBeLessThanOrEqual(500);
  });
});
