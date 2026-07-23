"use client";

/**
 * Hand-built SVG art for the SliceMatic Delhi night-delivery landing.
 *
 * Everything here is illustration — no product screenshots, no photos. Parts are
 * exported as <g> groups so they can be composed inside different <svg> canvases
 * (the full hero scene and the narrative road strips) and animated with GSAP.
 */

/** Row of distant Delhi high-rises along a baseline. */
export function SkylineFar({ fill }: { fill: string }) {
  const towers = [
    [40, 250, 70],
    [120, 210, 55],
    [190, 280, 60],
    [260, 200, 48],
    [560, 230, 64],
    [640, 190, 52],
    [1040, 240, 70],
    [1120, 205, 56],
  ] as const;
  const baseline = 470;
  return (
    <g opacity={0.85}>
      {towers.map(([x, top, w], i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={baseline - top} fill={fill} rx={3} />
          {Array.from({ length: 4 }).map((_, r) => (
            <rect
              key={r}
              x={x + 8}
              y={top + 16 + r * 22}
              width={w - 16}
              height={6}
              fill="#f0c04a"
              opacity={0.16 + ((i + r) % 3) * 0.12}
              rx={1}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/** Qutub Minar — tapering fluted tower with balcony rings. */
export function QutubMinar({ x = 0, fill }: { x?: number; fill: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d="M0 470 L6 250 Q10 236 20 236 Q30 236 34 250 L40 470 Z"
        fill={fill}
      />
      {[300, 356, 410].map((y, i) => (
        <rect key={i} x={-4 + i * 1.5} y={y} width={48 - i * 3} height={9} rx={3} fill={fill} />
      ))}
      <circle cx={20} cy={230} r={7} fill={fill} />
    </g>
  );
}

/** India Gate — wide memorial arch. */
export function IndiaGate({ x = 0, fill }: { x?: number; fill: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={0} y={300} width={130} height={170} fill={fill} rx={4} />
      <path d="M34 470 L34 372 Q65 330 96 372 L96 470 Z" fill="#120c16" />
      <rect x={-10} y={286} width={150} height={24} rx={6} fill={fill} />
      <rect x={16} y={262} width={98} height={20} rx={5} fill={fill} />
      <rect x={54} y={238} width={22} height={26} rx={4} fill={fill} />
    </g>
  );
}

/** Humayun's Tomb — bulbous dome on an arched plinth. */
export function DomeTomb({ x = 0, fill }: { x?: number; fill: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={0} y={366} width={180} height={104} rx={6} fill={fill} />
      {[24, 78, 132].map((ax, i) => (
        <path key={i} d={`M${ax} 470 L${ax} 410 Q${ax + 12} 388 ${ax + 24} 410 L${ax + 24} 470 Z`} fill="#120c16" />
      ))}
      <path d="M52 366 Q90 250 128 366 Z" fill={fill} />
      <path d="M86 366 Q90 262 94 262 Q98 262 128 366 Z" fill={fill} opacity={0.4} />
      <rect x={84} y={224} width={12} height={30} rx={3} fill={fill} />
      <circle cx={90} cy={220} r={7} fill={fill} />
    </g>
  );
}

/** Lotus Temple — overlapping petals. */
export function LotusTemple({ x = 0, fill }: { x?: number; fill: string }) {
  const petal = (dx: number, lean: number, h: number) =>
    `M${dx} 470 Q${dx + lean - 26} ${470 - h} ${dx + lean} ${470 - h - 40} Q${dx + lean + 26} ${470 - h} ${dx + 52} 470 Z`;
  return (
    <g transform={`translate(${x} 0)`}>
      <path d={petal(-40, 0, 70)} fill={fill} opacity={0.7} />
      <path d={petal(40, 0, 70)} fill={fill} opacity={0.7} />
      <path d={petal(-18, 0, 118)} fill={fill} />
      <path d={petal(18, 0, 118)} fill={fill} />
      <path d={petal(0, 0, 150)} fill={fill} />
    </g>
  );
}

/**
 * Scooter delivery rider facing right, drawn around a ~150x110 box.
 * idPrefix keeps gradient ids unique across multiple mounts.
 */
export function RiderGlyph({
  idPrefix = "rider",
  showBeam = true,
}: {
  idPrefix?: string;
  showBeam?: boolean;
}) {
  const beam = `${idPrefix}-beam`;
  return (
    <g>
      {showBeam && (
        <>
          <defs>
            <linearGradient id={beam} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M118 74 L210 44 L210 104 Z" fill={`url(#${beam})`} />
        </>
      )}

      {/* wheels */}
      <circle cx={34} cy={96} r={22} fill="#120c16" stroke="#3a2a33" strokeWidth={4} />
      <circle cx={122} cy={96} r={22} fill="#120c16" stroke="#3a2a33" strokeWidth={4} />
      <circle cx={34} cy={96} r={7} fill="#6c6660" />
      <circle cx={122} cy={96} r={7} fill="#6c6660" />

      {/* scooter body */}
      <path d="M34 96 L74 96 Q92 96 100 78 L112 78 Q124 78 122 96" fill="none" stroke="#c5362c" strokeWidth={9} strokeLinecap="round" />
      <path d="M104 78 Q118 56 118 70 L118 80 Z" fill="#c5362c" />
      <rect x={70} y={70} width={30} height={12} rx={4} fill="#8e241f" />
      <path d="M52 82 Q58 62 78 64" fill="none" stroke="#c5362c" strokeWidth={7} strokeLinecap="round" />

      {/* pizza delivery box */}
      <rect x={40} y={38} width={34} height={30} rx={5} fill="#d99532" stroke="#8e241f" strokeWidth={2.5} />
      <path d="M57 44 L64 60 L50 60 Z" fill="#f0c04a" />
      <circle cx={57} cy={53} r={2.4} fill="#c5362c" />

      {/* rider */}
      <path d="M78 66 Q90 40 96 40 L100 44 Q92 52 90 70 Z" fill="#166d45" />
      <circle cx={100} cy={34} r={12} fill="#2b2430" />
      <path d="M89 34 Q100 18 111 34 Z" fill="#c5362c" />
      <path d="M96 52 Q112 54 116 72" fill="none" stroke="#166d45" strokeWidth={8} strokeLinecap="round" />
      <path d="M88 68 Q86 84 74 92" fill="none" stroke="#1f5233" strokeWidth={9} strokeLinecap="round" />
    </g>
  );
}

/** Full pizza disc for signature cards. `seed` shuffles topping placement. */
export function PizzaDisc({ size = 180, seed = 0 }: { size?: number; seed?: number }) {
  const rng = (n: number) => {
    const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const toppings = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2 + rng(i) * 0.6;
    const radius = 22 + rng(i + 20) * 30;
    return {
      cx: 60 + Math.cos(angle) * radius,
      cy: 60 + Math.sin(angle) * radius,
      r: 5 + rng(i + 40) * 3,
      green: rng(i + 60) > 0.62,
    };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#d99532" />
      <circle cx="60" cy="60" r="48" fill="#f0c04a" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#e8b34a" strokeWidth="2" />
      {toppings.map((t, i) => (
        <circle key={i} cx={t.cx} cy={t.cy} r={t.r} fill={t.green ? "#166d45" : "#c5362c"} />
      ))}
    </svg>
  );
}

/** Simple pizza slice glyph for cards / accents. */
export function PizzaSlice({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M32 4 L58 52 Q32 62 6 52 Z" fill="#d99532" />
      <path d="M32 12 L52 50 Q32 58 12 50 Z" fill="#f0c04a" />
      <circle cx={32} cy={34} r={4} fill="#c5362c" />
      <circle cx={24} cy={46} r={3.4} fill="#c5362c" />
      <circle cx={41} cy={45} r={3.4} fill="#c5362c" />
      <circle cx={32} cy={50} r={2.6} fill="#166d45" />
    </svg>
  );
}
