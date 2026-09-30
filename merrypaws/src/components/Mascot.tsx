// Biscuit: a brown curly-coated doodle in a burgundy neckerchief. Drawn as
// clusters of overlapping curls so the coat reads as curly at any size. He
// dresses for each era on the style cards until real example stills exist.

import type { Costume } from "@/lib/styles";

export type Mood = "idle" | "working" | "cheer";

type Curl = [number, number, number];

// Curl clusters: [cx, cy, r]. Each is drawn as a fill plus a darker rim.
const BODY: Curl[] = [
  [100, 150, 34], [74, 158, 22], [126, 158, 22], [86, 176, 20], [114, 176, 20],
  [100, 182, 18], [70, 176, 14], [130, 176, 14], [92, 134, 18], [108, 134, 18],
];
const HEAD: Curl[] = [
  [100, 86, 30], [78, 76, 16], [122, 76, 16], [84, 60, 14], [100, 54, 15],
  [116, 60, 14], [92, 46, 11], [108, 46, 11], [100, 40, 10], [72, 92, 13], [128, 92, 13],
];
const EAR_L: Curl[] = [[64, 84, 12], [60, 98, 12], [58, 112, 11], [62, 124, 10]];
const EAR_R: Curl[] = [[136, 84, 12], [140, 98, 12], [142, 112, 11], [138, 124, 10]];
const TAIL: Curl[] = [[150, 150, 9], [158, 142, 9], [163, 132, 8], [164, 122, 8]];

function Curls({ curls, fill, rim }: { curls: Curl[]; fill: string; rim: string }) {
  return (
    <>
      {curls.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} stroke={rim} strokeWidth={2.2} />
      ))}
      {/* A small highlight curl on top of the bigger ones sells the texture. */}
      {curls
        .filter(([, , r]) => r >= 14)
        .map(([cx, cy, r], i) => (
          <path
            key={`h${i}`}
            d={`M ${cx - r * 0.45} ${cy - r * 0.2} q ${r * 0.25} ${-r * 0.45} ${r * 0.55} ${-r * 0.15}`}
            fill="none"
            stroke="#b27a4a"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
    </>
  );
}

function Neckwear({ costume }: { costume: Costume }) {
  if (costume === "pearls") {
    const pearls = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return [72 + t * 56, 114 + Math.sin(t * Math.PI) * 11] as const;
    });
    return (
      <g>
        {pearls.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4.2} fill="#f7f1e6" stroke="#b9a88f" strokeWidth={1.2} />
        ))}
      </g>
    );
  }
  if (costume === "boater") {
    // A bow tie for the silent era.
    return (
      <g fill="#2a1b14">
        <path d="M 100 120 L 84 111 L 84 129 Z" />
        <path d="M 100 120 L 116 111 L 116 129 Z" />
        <circle cx="100" cy="120" r="4" />
      </g>
    );
  }
  if (costume === "scarf") {
    return (
      <g stroke="#6b0d17" strokeWidth={2}>
        <path d="M 68 110 Q 100 128 132 110 L 130 124 Q 100 138 70 124 Z" fill="#b3202c" />
        <path d="M 112 124 L 118 160 L 106 162 L 102 128 Z" fill="#b3202c" />
        <path d="M 80 116 L 80 126 M 92 119 L 92 130 M 108 119 L 108 130 M 120 116 L 120 126" stroke="#f3eadb" strokeWidth={2.4} />
      </g>
    );
  }
  if (costume === "crown") {
    // An ermine collar under the crown.
    return (
      <g>
        <path d="M 64 110 Q 100 132 136 110 L 132 126 Q 100 144 68 126 Z" fill="#f7f1e6" stroke="#b9a88f" strokeWidth={2} />
        {[78, 92, 108, 122].map((x) => (
          <path key={x} d={`M ${x} 124 l 2 5 l -4 0 z`} fill="#2a1b14" />
        ))}
      </g>
    );
  }
  return (
    <g>
      <path d="M 70 112 Q 100 126 130 112 L 122 122 Q 100 134 78 122 Z" fill="#7a0f1b" stroke="#4d0810" strokeWidth={2} />
      <path d="M 94 124 L 100 144 L 106 124 Z" fill="#7a0f1b" stroke="#4d0810" strokeWidth={2} />
    </g>
  );
}

function Hat({ costume, mood }: { costume: Costume; mood: Mood }) {
  if (mood === "working") {
    // Director's beret while the portrait develops.
    return (
      <g>
        <ellipse cx="100" cy="42" rx="26" ry="9" fill="#2a1b14" />
        <circle cx="100" cy="33" r="3" fill="#2a1b14" />
      </g>
    );
  }
  if (costume === "crown") {
    return (
      <g>
        <path d="M 82 42 L 84 22 L 92 32 L 100 18 L 108 32 L 116 22 L 118 42 Z" fill="#c9a24a" stroke="#8a6a22" strokeWidth={2} strokeLinejoin="round" />
        <circle cx="100" cy="35" r="3" fill="#7a0f1b" />
      </g>
    );
  }
  if (costume === "fedora") {
    return (
      <g>
        <ellipse cx="100" cy="42" rx="40" ry="8" fill="#1d1612" />
        <path d="M 76 42 Q 76 16 100 18 Q 124 16 124 42 Z" fill="#2b221c" />
        <path d="M 90 20 Q 100 28 110 20" fill="none" stroke="#1d1612" strokeWidth={3} />
        <rect x="77" y="34" width="46" height="6" fill="#4a3a30" />
      </g>
    );
  }
  if (costume === "boater") {
    return (
      <g>
        <ellipse cx="100" cy="40" rx="38" ry="7" fill="#d8b56a" stroke="#9c7a33" strokeWidth={1.5} />
        <rect x="80" y="24" width="40" height="16" rx="2" fill="#e3c27a" stroke="#9c7a33" strokeWidth={1.5} />
        <rect x="80" y="32" width="40" height="5" fill="#2a1b14" />
      </g>
    );
  }
  if (costume === "scarf") {
    // A knitted bobble hat for Christmas.
    return (
      <g>
        <path d="M 78 44 Q 78 18 100 16 Q 122 18 122 44 Z" fill="#b3202c" stroke="#6b0d17" strokeWidth={2} />
        <rect x="76" y="38" width="48" height="9" rx="4" fill="#f3eadb" />
        <circle cx="100" cy="14" r="6" fill="#f3eadb" />
      </g>
    );
  }
  return null;
}

type MascotProps = { mood?: Mood; size?: number; className?: string; costume?: Costume; still?: boolean };

export function Mascot({ mood = "idle", size = 160, className = "", costume = "none", still = false }: MascotProps) {
  const coat = "#8a5530";
  const rim = "#5e3519";
  const dark = "#6b3e22";

  return (
    <svg
      viewBox="30 0 150 200"
      width={size}
      height={(size * 200) / 150}
      overflow="visible"
      className={`mascot ${className}`}
      data-mood={mood}
      data-still={still || undefined}
      role="img"
      aria-label="Biscuit, a curly brown dog"
    >
      <g className="whole">
        <ellipse cx="102" cy="197" rx="46" ry="5" fill="#2a1b14" opacity="0.18" />
        <g className="tail">
          <Curls curls={TAIL} fill={coat} rim={rim} />
        </g>
        <g className="body">
          <Curls curls={BODY} fill={coat} rim={rim} />
          {/* Front paws */}
          <ellipse cx="88" cy="192" rx="11" ry="7" fill={dark} stroke={rim} strokeWidth={2} />
          <ellipse cx="112" cy="192" rx="11" ry="7" fill={dark} stroke={rim} strokeWidth={2} />
          <Neckwear costume={costume} />
        </g>
        <g className="head">
          <g className="ear-l">
            <Curls curls={EAR_L} fill={dark} rim={rim} />
          </g>
          <g className="ear-r">
            <Curls curls={EAR_R} fill={dark} rim={rim} />
          </g>
          <Curls curls={HEAD} fill={coat} rim={rim} />
          {/* Muzzle */}
          <ellipse cx="100" cy="100" rx="19" ry="14" fill="#c48a58" stroke={rim} strokeWidth={2} />
          <path d="M 91 91 Q 100 84 109 91 Q 108 98 100 99 Q 92 98 91 91 Z" fill="#1d1410" />
          <ellipse cx="97" cy="89" rx="3" ry="1.6" fill="#fff" opacity="0.5" />
          <path d="M 100 99 L 100 104 M 92 106 Q 100 112 108 106" fill="none" stroke="#1d1410" strokeWidth={2.2} strokeLinecap="round" />
          {mood === "cheer" && <path d="M 96 108 Q 100 120 104 108 Z" fill="#e5707a" stroke="#1d1410" strokeWidth={1.5} />}
          <g className="eyes">
            <ellipse cx="88" cy="78" rx="5" ry="6" fill="#1d1410" />
            <ellipse cx="112" cy="78" rx="5" ry="6" fill="#1d1410" />
            <circle cx="89.8" cy="75.6" r="1.8" fill="#fff" />
            <circle cx="113.8" cy="75.6" r="1.8" fill="#fff" />
          </g>
          <Hat costume={costume} mood={mood} />
        </g>
      </g>
    </svg>
  );
}
