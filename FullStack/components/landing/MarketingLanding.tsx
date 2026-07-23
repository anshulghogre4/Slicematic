"use client";

/**
 * SliceMatic marketing landing — creative R1.
 *
 * A cinematic Delhi night-delivery story: brand-first full-bleed hero, a scooter
 * rider that rides a road ribbon (GSAP MotionPath), Lenis smooth scroll synced to
 * ScrollTrigger, and committed Lottie objects. All artwork is illustration / SVG /
 * CSS / Lottie — no product screenshots or photography.
 *
 * Motion + smooth scroll live here only; /signin, checkout, and admin never mount
 * Lenis or GSAP. See plans/landing-page-vision.md.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Pizza } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ThemeToggle } from "../ThemeToggle";
import { seedMenu } from "../../lib/seed-data";
import { useLandingLenis } from "./hooks/useLandingLenis";
import { Hero } from "./Hero";
import { NarrativeSlides } from "./NarrativeSlides";
import { PizzaDisc } from "./art/scene-parts";

const FEATURED_CODES = ["P8", "P6", "P7", "P2", "P1", "P5"] as const;

const featuredPizzas = FEATURED_CODES.map((code) => {
  const pizza = seedMenu.pizzas.find((item) => item.code === code);
  if (!pizza) throw new Error(`Missing seed pizza ${code}`);
  return pizza;
});

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function MarketingLanding() {
  const { reducedMotion } = useLandingLenis();
  const signatureRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (reducedMotion || !signatureRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const q = self.selector!;
      gsap.from(q(".sig-card"), {
        y: 48,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: signatureRef.current, start: "top 75%" },
      });
    }, signatureRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div className="landing-root min-h-[100dvh] font-body text-[#f4e9d8]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8613b] text-[#1d1224]">
            <Pizza size={18} aria-hidden />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-[#fef4e2]">SliceMatic</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-[#f4e9d8]" />
          <Link
            href="/signin"
            className="inline-flex min-h-9 items-center rounded-full bg-[#fef4e2] px-5 text-sm font-semibold text-[#1d1224] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd98a]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <Hero reducedMotion={reducedMotion} />

        <NarrativeSlides reducedMotion={reducedMotion} />

        {/* Signature slices — illustrated, no photography */}
        <section
          ref={signatureRef}
          className="relative border-t border-[#e8613b]/20 px-6 py-24"
          aria-labelledby="signature-heading"
        >
          <div className="mx-auto max-w-6xl">
            <p className="font-body text-sm font-semibold uppercase tracking-[0.24em] text-[#e8613b]">Tonight&apos;s oven</p>
            <h2 id="signature-heading" className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.02] text-[#fef4e2]">
              Signature slices
            </h2>
            <p className="mt-4 max-w-[46ch] font-body text-lg leading-relaxed text-[#f4e9d8]/75">
              The same New Ashok Nagar menu you build and order inside the app.
            </p>

            <ul className="landing-slice-rail mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6 md:grid md:grid-cols-3 md:overflow-visible">
              {featuredPizzas.map((pizza, i) => (
                <li
                  key={pizza.code}
                  className="sig-card group w-[74vw] max-w-[300px] shrink-0 snap-start rounded-[2rem] border border-[#f4e9d8]/12 bg-gradient-to-br from-[#2a1424]/80 to-[#160d1c]/80 p-7 backdrop-blur-sm md:w-auto md:max-w-none"
                >
                  <div className="flex justify-center transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                    <PizzaDisc size={168} seed={i + 1} />
                  </div>
                  <div className="mt-6">
                    <p className="font-display text-xl font-bold text-[#fef4e2]">{pizza.name}</p>
                    <p className="mt-1 font-body text-sm text-[#f4e9d8]/60">
                      {formatInr(pizza.price)}
                      {pizza.badge ? ` · ${pizza.badge}` : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-12">
              <Link
                href="/signin"
                className="inline-flex min-h-12 items-center rounded-full bg-[#e8613b] px-8 text-base font-semibold text-[#1d1224] shadow-[0_18px_40px_-12px_rgba(232,97,59,0.7)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd98a]"
              >
                Order signature slices
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#f4e9d8]/12 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 font-body text-sm text-[#f4e9d8]/55 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#e8613b] text-[#1d1224]">
              <Pizza size={13} aria-hidden />
            </span>
            New Ashok Nagar, Delhi NCR
          </p>
          <p>
            Operators:{" "}
            <Link href="/signin" className="text-[#f4e9d8] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
