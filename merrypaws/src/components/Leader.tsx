"use client";

import { useEffect, useState } from "react";

// The film-leader countdown shown while a portrait develops. It counts 5 to 2
// and then holds on the sweep until the image is ready: honest waiting, no
// fake progress bar.
export function Leader() {
  const [n, setN] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setN((v) => (v > 2 ? v - 1 : v)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <rect width="200" height="200" fill="#1a1b20" />
      <line x1="100" y1="0" x2="100" y2="200" stroke="#ecebe6" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="0" y1="100" x2="200" y2="100" stroke="#ecebe6" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#ecebe6" strokeOpacity="0.6" strokeWidth="3" />
      <circle cx="100" cy="100" r="64" fill="none" stroke="#ecebe6" strokeOpacity="0.35" strokeWidth="2" />
      <g className="leader-sweep">
        <path d="M100 100 L100 22 A78 78 0 0 1 178 100 Z" fill="#ecebe6" fillOpacity="0.12" />
        <line x1="100" y1="100" x2="100" y2="22" stroke="#f3c318" strokeWidth="3" />
      </g>
      <text x="100" y="124" textAnchor="middle" fontSize="72" fontWeight="800" fill="#ecebe6" style={{ fontFamily: "var(--font-shoulders)" }}>
        {n}
      </text>
    </svg>
  );
}
