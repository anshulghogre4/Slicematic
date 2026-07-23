"use client";

import {
  DomeTomb,
  IndiaGate,
  LotusTemple,
  QutubMinar,
  RiderGlyph,
  SkylineFar,
} from "./scene-parts";

/**
 * Full-bleed Delhi night-delivery scene used as the hero visual plane.
 *
 * Warm tomato/gold dusk over the Yamuna with recognisable Delhi silhouettes,
 * a road ribbon, and a scooter rider. GSAP targets these ids from the hero:
 *   #hero-road    — motion path for the rider
 *   #hero-rider   — the scooter rider group
 *   .hero-star    — twinkle
 *   .hero-parallax-*  — depth layers
 */
export function DelhiScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of a SliceMatic scooter delivering pizza across a Delhi skyline at dusk"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1224" />
          <stop offset="0.45" stopColor="#4a1c2c" />
          <stop offset="0.72" stopColor="#a5302f" />
          <stop offset="0.86" stopColor="#d99532" />
          <stop offset="1" stopColor="#efc06a" />
        </linearGradient>
        <radialGradient id="hero-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9b8" />
          <stop offset="0.6" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d99532" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#7a3a44" />
          <stop offset="1" stopColor="#2a1a2a" />
        </linearGradient>
        <linearGradient id="hero-road-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#211622" />
          <stop offset="1" stopColor="#0d0910" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="1200" height="700" fill="url(#hero-sky)" />

      {/* stars */}
      <g fill="#ffe9b8">
        {[
          [120, 80, 1.6],
          [260, 140, 1.1],
          [420, 60, 1.4],
          [640, 110, 1.2],
          [820, 70, 1.6],
          [980, 150, 1.1],
          [1080, 90, 1.4],
          [520, 170, 1],
          [720, 40, 1.2],
        ].map(([cx, cy, r], i) => (
          <circle key={i} className="hero-star" cx={cx} cy={cy} r={r} opacity={0.85} />
        ))}
      </g>

      {/* moon */}
      <g className="hero-parallax-far">
        <circle cx="930" cy="150" r="120" fill="url(#hero-moon)" opacity="0.9" />
        <circle cx="930" cy="150" r="52" fill="#fff2d0" />
      </g>

      {/* skyline + landmarks */}
      <g className="hero-parallax-mid">
        <SkylineFar fill="#1a1020" />
        <QutubMinar x={330} fill="#160d1c" />
        <IndiaGate x={452} fill="#160d1c" />
        <LotusTemple x={648} fill="#180f1e" />
        <DomeTomb x={800} fill="#160d1c" />
      </g>

      {/* Yamuna */}
      <g>
        <rect x="0" y="470" width="1200" height="78" fill="url(#hero-river)" />
        {[486, 502, 520, 536].map((y, i) => (
          <rect key={i} x={120 + i * 60} y={y} width={260 - i * 30} height={2.5} fill="#ffe9b8" opacity={0.35 - i * 0.06} rx={2} />
        ))}
        {[700, 900, 1040].map((x, i) => (
          <rect key={`b${i}`} x={x} y={498 + i * 12} width={160} height={2.5} fill="#ffd98a" opacity={0.28} rx={2} />
        ))}
      </g>

      {/* road */}
      <path d="M0 548 L1200 512 L1200 700 L0 700 Z" fill="url(#hero-road-fill)" />
      <path
        id="hero-road"
        d="M-60 636 C 220 604, 420 664, 640 628 C 860 592, 1020 636, 1260 604"
        fill="none"
        stroke="none"
      />
      {/* road centre dashes tracing the ribbon */}
      <path
        d="M-60 656 C 220 624, 420 684, 640 648 C 860 612, 1020 656, 1260 624"
        fill="none"
        stroke="#d99532"
        strokeWidth="4"
        strokeDasharray="26 30"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* rider — GSAP places this along #hero-road */}
      <g id="hero-rider">
        <RiderGlyph idPrefix="hero" />
      </g>
    </svg>
  );
}
