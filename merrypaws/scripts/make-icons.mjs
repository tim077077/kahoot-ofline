// Draws the app icons (a paw print on the album's cream paper) into public/.
// Run again after changing colours: node scripts/make-icons.mjs
import sharp from "sharp";

const paw = (fill) => `
  <ellipse cx="256" cy="318" rx="92" ry="78" fill="${fill}"/>
  <ellipse cx="160" cy="214" rx="38" ry="50" transform="rotate(-18 160 214)" fill="${fill}"/>
  <ellipse cx="226" cy="160" rx="38" ry="52" transform="rotate(-6 226 160)" fill="${fill}"/>
  <ellipse cx="300" cy="160" rx="38" ry="52" transform="rotate(8 300 160)" fill="${fill}"/>
  <ellipse cx="364" cy="218" rx="38" ry="50" transform="rotate(20 364 218)" fill="${fill}"/>`;

const icon = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f5eee3"/>
  <rect x="28" y="28" width="456" height="456" rx="36" fill="none" stroke="#e4d3b0" stroke-width="10"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${paw("#7a0f1b")}</g>
</svg>`;

// The Android status-bar badge: white on transparent.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${paw("#ffffff")}</svg>`;

const out = [
  ["public/icon-192.png", icon(0.9), 192],
  ["public/icon-512.png", icon(0.9), 512],
  ["public/icon-maskable-512.png", icon(0.7), 512],
  ["src/app/apple-icon.png", icon(0.9), 180],
  ["public/badge-96.png", badge, 96],
];
for (const [file, svg, size] of out) await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
console.log("icons written");
