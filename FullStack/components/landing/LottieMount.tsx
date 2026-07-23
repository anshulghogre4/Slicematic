"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

type LottieMountProps = {
  /** Path to a Lottie JSON under /public (e.g. "/lottie/pizza-spin.json"). */
  src: string;
  /** Accessible label; the animation is decorative by default. */
  label?: string;
  className?: string;
  loop?: boolean;
  /** When true we never animate — render the static fallback art instead. */
  reducedMotion?: boolean;
  /** SVG/CSS art shown while loading, on failure, or under reduced motion. */
  fallback: ReactNode;
};

/**
 * Reliable Lottie wrapper.
 *
 * - Loads committed JSON from /public (no CDN rot).
 * - Falls back to inline SVG art if the JSON fails to load or motion is reduced.
 * - Pauses when scrolled off-screen to keep the main thread free.
 */
export function LottieMount({
  src,
  label,
  className,
  loop = true,
  reducedMotion = false,
  fallback,
}: LottieMountProps) {
  const [data, setData] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    let active = true;
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Lottie ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [src, reducedMotion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !data || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const api = lottieRef.current;
        if (!api) return;
        if (entry.isIntersecting) api.play();
        else api.pause();
      },
      { threshold: 0.15 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [data, reducedMotion]);

  if (reducedMotion || failed || !data) {
    return (
      <div className={className} aria-hidden={!label} aria-label={label} role={label ? "img" : undefined}>
        {fallback}
      </div>
    );
  }

  return (
    <div ref={hostRef} className={className} aria-hidden={!label} aria-label={label} role={label ? "img" : undefined}>
      <Lottie
        lottieRef={lottieRef}
        animationData={data}
        loop={loop}
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
