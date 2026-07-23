"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { DelhiScene } from "./art/DelhiScene";

const HEADLINE = ["Delhi's", "midnight", "slice", "run."];

export function Hero({ reducedMotion }: { reducedMotion: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    const ctx = gsap.context((self) => {
      const q = self.selector!;

      // Entrance choreography — one orchestrated load.
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(q(".hero-brand"), { yPercent: 30, opacity: 0, duration: 1 })
        .from(q(".hero-headline-word"), { yPercent: 118, opacity: 0, stagger: 0.09, duration: 0.75 }, "-=0.45")
        .from(q(".hero-sub"), { y: 22, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(q(".hero-cta"), { y: 16, opacity: 0, stagger: 0.12, duration: 0.5 }, "-=0.3")
        .from(q(".hero-scene"), { opacity: 0, duration: 1.2 }, 0);

      // Rider loops along the road ribbon.
      gsap.to("#hero-rider", {
        duration: 11,
        repeat: -1,
        ease: "none",
        motionPath: {
          path: "#hero-road",
          align: "#hero-road",
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
        },
      });

      // Star twinkle.
      q(".hero-star").forEach((star: Element, i: number) => {
        gsap.to(star, {
          opacity: 0.15,
          duration: 1.1 + (i % 4) * 0.35,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.18,
        });
      });

      // Depth parallax as the hero scrolls away.
      const scrub = { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: true } as const;
      gsap.to(q(".hero-parallax-far"), { yPercent: 14, ease: "none", scrollTrigger: scrub });
      gsap.to(q(".hero-parallax-mid"), { yPercent: 26, ease: "none", scrollTrigger: scrub });
      gsap.to(q(".hero-copy"), { yPercent: -12, opacity: 0.35, ease: "none", scrollTrigger: scrub });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={rootRef}
      className="landing-hero relative flex min-h-[100dvh] flex-col justify-end overflow-hidden"
      aria-label="SliceMatic"
    >
      <DelhiScene className="hero-scene pointer-events-none absolute inset-0 h-full w-full" />
      {/* legibility veil at the base so copy always clears the artwork */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0d0910] via-[#0d0910]/80 to-transparent" aria-hidden />

      <div className="hero-copy relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 md:pb-24">
        <p className="hero-brand font-display text-[clamp(3.2rem,13vw,10rem)] font-extrabold leading-[0.86] tracking-tight text-[#fef4e2]">
          Slice<span className="text-[#e8613b]">Matic</span>
        </p>

        <h1 className="mt-4 font-display text-[clamp(1.6rem,4.4vw,3.2rem)] font-bold leading-[1.05] text-[#ffd98a]">
          {HEADLINE.map((word, i) => (
            <span key={i} className="mr-[0.28em] inline-block overflow-hidden align-bottom">
              <span className="hero-headline-word inline-block">{word}</span>
            </span>
          ))}
        </h1>

        <p className="hero-sub mt-4 max-w-[46ch] font-body text-base leading-relaxed text-[#f4e9d8]/85 md:text-lg">
          Built hot in the New Ashok Nagar oven and ridden straight to your Delhi doorstep, with GST shown clearly before you pay.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/signin"
            className="hero-cta inline-flex min-h-12 items-center rounded-full bg-[#e8613b] px-8 text-base font-semibold text-[#1d1224] shadow-[0_18px_40px_-12px_rgba(232,97,59,0.7)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd98a] active:translate-y-0"
          >
            Sign in
          </Link>
          <Link
            href="/signin"
            className="hero-cta inline-flex min-h-12 items-center rounded-full border border-[#f4e9d8]/40 px-8 text-base font-semibold text-[#f4e9d8] backdrop-blur-sm transition-colors duration-150 hover:bg-[#f4e9d8]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd98a]"
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </section>
  );
}
