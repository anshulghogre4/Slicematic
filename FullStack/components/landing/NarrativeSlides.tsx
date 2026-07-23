"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { LottieMount } from "./LottieMount";
import { PizzaSlice, RiderGlyph, SkylineFar } from "./art/scene-parts";

function OvenArt() {
  return (
    <svg viewBox="0 0 260 220" className="h-full w-full" role="img" aria-label="Stone oven baking a pizza">
      <rect x="20" y="150" width="220" height="52" rx="10" fill="#160d1c" />
      <path d="M40 150 Q130 30 220 150 Z" fill="#2a1a2a" stroke="#e8613b" strokeWidth="4" />
      <path d="M70 150 Q130 74 190 150 Z" fill="#0d0910" />
      <path d="M92 150 Q130 108 168 150 Z" fill="#e8613b" opacity="0.55" />
      <ellipse cx="130" cy="150" rx="40" ry="8" fill="#d99532" />
      <circle cx="118" cy="147" r="4" fill="#c5362c" />
      <circle cx="140" cy="149" r="4" fill="#c5362c" />
      <circle cx="130" cy="145" r="3" fill="#166d45" />
    </svg>
  );
}

function DoorstepArt() {
  return (
    <svg viewBox="0 0 260 220" className="h-full w-full" role="img" aria-label="Pizza box waiting on a Delhi doorstep">
      <rect x="150" y="30" width="90" height="180" rx="6" fill="#2a1a2a" />
      <rect x="164" y="46" width="62" height="150" rx="4" fill="#160d1c" />
      <circle cx="216" cy="126" r="4" fill="#d99532" />
      <rect x="20" y="150" width="150" height="60" fill="#1a1020" />
      <rect x="52" y="150" width="150" height="8" fill="#e8613b" opacity="0.5" />
      <rect x="70" y="120" width="72" height="34" rx="5" fill="#d99532" stroke="#8e241f" strokeWidth="3" />
      <path d="M96 126 L106 146 L86 146 Z" fill="#f0c04a" />
      <circle cx="96" cy="138" r="3" fill="#c5362c" />
    </svg>
  );
}

function RideStrip() {
  return (
    <svg viewBox="0 0 1200 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Scooter riding across the Delhi skyline">
      <defs>
        <linearGradient id="ride-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1424" />
          <stop offset="1" stopColor="#4a1c2c" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="300" fill="url(#ride-sky)" />
      <g transform="translate(0 -230) scale(1 1)">
        <SkylineFar fill="#180f1e" />
      </g>
      <path d="M0 250 L1200 236 L1200 300 L0 300 Z" fill="#120c16" />
      <path
        id="ride-road"
        d="M-80 244 C 300 236, 600 252, 900 240 C 1050 234, 1180 244, 1280 240"
        fill="none"
        stroke="none"
      />
      <path
        d="M-80 258 C 300 250, 600 266, 900 254 C 1050 248, 1180 258, 1280 254"
        fill="none"
        stroke="#d99532"
        strokeWidth="4"
        strokeDasharray="24 28"
        opacity="0.7"
      />
      <g id="ride-rider">
        <RiderGlyph idPrefix="ride" />
      </g>
    </svg>
  );
}

type Panel = {
  eyebrow: string;
  title: string;
  body: string;
};

const PANELS: Panel[] = [
  { eyebrow: "01 / Order", title: "Build a slice that is yours", body: "Pick your crust, size, and toppings with live pricing. No surprises and no hidden charges before checkout." },
  { eyebrow: "02 / Kitchen", title: "Fired fresh in New Ashok Nagar", body: "Every base is stretched, dressed, and baked to order in our single Delhi outlet." },
  { eyebrow: "03 / The ride", title: "Straight across the city", body: "Your order rides the Delhi streets from our oven toward your address, hot the whole way." },
  { eyebrow: "04 / Doorstep", title: "Hot when it lands", body: "Pay by Cash, UPI, or Card. GST and any bulk discount are shown before you confirm." },
];

export function NarrativeSlides({ reducedMotion }: { reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    const ctx = gsap.context((self) => {
      const q = self.selector!;

      q(".slide-panel").forEach((panel: Element) => {
        gsap.from(panel.querySelectorAll(".slide-rise"), {
          y: 40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: panel, start: "top 78%" },
        });
      });

      // Scooter scrubs across the Delhi strip as the ride panel scrolls.
      const ridePanel = q(".slide-ride")[0];
      if (ridePanel) {
        gsap.to("#ride-rider", {
          ease: "none",
          motionPath: {
            path: "#ride-road",
            align: "#ride-road",
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
          },
          scrollTrigger: { trigger: ridePanel, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="landing-narrative">
      {/* Ride strip banner */}
      <section className="slide-panel slide-ride relative h-[42vh] min-h-[280px] w-full overflow-hidden border-y border-[#e8613b]/20">
        <RideStrip />
      </section>

      {PANELS.map((panel, i) => {
        const isRide = i === 2;
        const flip = i % 2 === 1;
        return (
          <section
            key={panel.eyebrow}
            className="slide-panel relative flex min-h-[86vh] items-center px-6 py-20"
          >
            <div
              className={`mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2 ${
                flip ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="max-w-[52ch]">
                <p className="slide-rise font-body text-sm font-semibold uppercase tracking-[0.24em] text-[#e8613b]">
                  {panel.eyebrow}
                </p>
                <h2 className="slide-rise mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.02] text-[#fef4e2]">
                  {panel.title}
                </h2>
                <p className="slide-rise mt-5 font-body text-lg leading-relaxed text-[#f4e9d8]/75">
                  {panel.body}
                </p>
              </div>

              <div className="slide-rise relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
                <div className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#4a1c2c] to-[#1d1224] shadow-[0_40px_80px_-30px_rgba(232,97,59,0.5)]" aria-hidden />
                {i === 0 && (
                  <LottieMount
                    src="/lottie/pizza-spin.json"
                    className="relative z-10 h-3/4 w-3/4"
                    reducedMotion={reducedMotion}
                    label="Spinning pizza with fresh toppings"
                    fallback={<div className="flex h-full w-full items-center justify-center"><PizzaSlice size={160} /></div>}
                  />
                )}
                {i === 1 && (
                  <div className="relative z-10 h-3/4 w-3/4">
                    <OvenArt />
                    <LottieMount
                      src="/lottie/steam.json"
                      className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-1/2 w-1/3"
                      reducedMotion={reducedMotion}
                      fallback={<span className="sr-only">Steam rising from the oven</span>}
                    />
                  </div>
                )}
                {isRide && (
                  <div className="relative z-10 h-3/4 w-3/4">
                    <svg viewBox="0 0 260 200" className="h-full w-full" aria-hidden>
                      <g transform="translate(52 44)">
                        <RiderGlyph idPrefix="panel" />
                      </g>
                    </svg>
                  </div>
                )}
                {i === 3 && <div className="relative z-10 h-3/4 w-3/4"><DoorstepArt /></div>}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
