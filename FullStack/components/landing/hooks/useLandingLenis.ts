"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Landing-only smooth scroll.
 *
 * Wires Lenis to the GSAP ticker and syncs ScrollTrigger (canonical recipe from
 * the Lenis README). Smooth scroll + the GSAP ticker are fully disabled when the
 * visitor prefers reduced motion, so the page falls back to native scroll with no
 * scrubbing. Everything is torn down on unmount so no motion leaks into /signin,
 * the customer shell, or admin routes.
 */
export function useLandingLenis(): { reducedMotion: boolean } {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) {
      setReducedMotion(true);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Recalculate pinned/scrubbed triggers once layout settles.
    const refresh = () => ScrollTrigger.refresh();
    const raf = window.requestAnimationFrame(refresh);

    return () => {
      window.cancelAnimationFrame(raf);
      gsap.ticker.remove(onTick);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, []);

  return { reducedMotion };
}
