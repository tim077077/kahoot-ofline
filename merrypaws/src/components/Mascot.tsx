// Biscuit: a brown curly-coated doodle in a film-yellow neckerchief. Drawn as
// clusters of overlapping curls so the coat reads as curly at any size.

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

export function Mascot({ mood = "idle", size = 160, className = "" }: { mood?: Mood; size?: number; className?: string }) {
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
      role="img"
      aria-label="Biscuit, a curly brown dog"
    >
      <g className="whole">
        <ellipse cx="102" cy="197" rx="46" ry="5" fill="#000" opacity="0.35" />
        <g className="tail">
          <Curls curls={TAIL} fill={coat} rim={rim} />
        </g>
        <g className="body">
          <Curls curls={BODY} fill={coat} rim={rim} />
          {/* Front paws */}
          <ellipse cx="88" cy="192" rx="11" ry="7" fill={dark} stroke={rim} strokeWidth={2} />
          <ellipse cx="112" cy="192" rx="11" ry="7" fill={dark} stroke={rim} strokeWidth={2} />
          {/* Neckerchief in film-stock yellow */}
          <path d="M 70 112 Q 100 126 130 112 L 122 122 Q 100 134 78 122 Z" fill="#f3c318" stroke="#9c7a07" strokeWidth={2} />
          <path d="M 94 124 L 100 144 L 106 124 Z" fill="#f3c318" stroke="#9c7a07" strokeWidth={2} />
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
          {mood === "working" && (
            // Director's beret while the film develops.
            <g>
              <ellipse cx="100" cy="42" rx="26" ry="9" fill="#16130a" />
              <circle cx="100" cy="33" r="3" fill="#16130a" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
