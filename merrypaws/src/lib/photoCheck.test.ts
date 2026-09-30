import { describe, expect, it } from "vitest";
import { judge, measure } from "./photoCheck";

const W = 64;

function image(fn: (x: number, y: number) => number) {
  const out: number[] = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) out.push(fn(x, y));
  return out;
}

describe("photo checks", () => {
  it("scores a detailed image as sharp and a smooth one as blurry", () => {
    const checker = measure(image((x, y) => ((x >> 1) + (y >> 1)) % 2 ? 220 : 40), W, W);
    const smooth = measure(image((x) => 60 + x * 2), W, W);
    expect(checker.sharpness).toBeGreaterThan(1000);
    expect(smooth.sharpness).toBeLessThan(1);
  });

  it("names the first problem it finds", () => {
    const ok = { width: 1200, height: 1600, brightness: 120, sharpness: 90 };
    expect(judge(ok)).toBeNull();
    expect(judge({ ...ok, width: 200 })).toBe("small");
    expect(judge({ ...ok, brightness: 20 })).toBe("dark");
    expect(judge({ ...ok, sharpness: 5 })).toBe("blurry");
  });
});
