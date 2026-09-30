// Deckle edges: the wavy, hand-cut border of photo prints from the 1940s to
// the 60s. Built once as an SVG mask with a seeded wobble, so every print has
// the same believable edge without shipping an image.

function wobble(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function edgePath(w: number, h: number, step: number, depth: number, seed: number) {
  const rand = wobble(seed);
  const pts: string[] = [];
  const jitter = () => (rand() * 0.6 + 0.4) * depth;
  for (let x = 0; x <= w; x += step) pts.push(`${x},${jitter()}`);
  for (let y = step; y <= h; y += step) pts.push(`${w - jitter()},${y}`);
  for (let x = w - step; x >= 0; x -= step) pts.push(`${x},${h - jitter()}`);
  for (let y = h - step; y > 0; y -= step) pts.push(`${jitter()},${y}`);
  return `M${pts.join(" L")} Z`;
}

const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 250' preserveAspectRatio='none'><path d='${edgePath(200, 250, 4, 3.2, 7)}' fill='black'/></svg>`;

export const DECKLE_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
