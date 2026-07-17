"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/* ── Shared easing presets ── */
const easeOut = [0.23, 1, 0.32, 1] as const;
const easeSpring = { type: "spring", stiffness: 380, damping: 30 } as const;

/* ── Page section entrance ── */
export function FadeInUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: easeOut, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Scale entrance (for modals, toasts) ── */
export function ScaleIn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Slide up from bottom (for bottom sheets) ── */
export function SlideUp({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.3, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Slide in from right (for drawers) ── */
export function SlideInRight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.24, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Cart add bounce ── */
export function CartBounce({
  children,
  trigger,
  className,
}: {
  children: ReactNode;
  trigger: number; // increment to re-trigger
  className?: string;
}) {
  return (
    <motion.div
      key={trigger}
      animate={{ scale: [1, 1.12, 0.95, 1] }}
      transition={{ duration: 0.35, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Staggered children ── */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: easeOut } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Modal overlay with backdrop blur ── */
export function ModalOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(22, 21, 19, 0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div onClick={(e) => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Number crossfade (for price changes, counts) ── */
export function NumberCrossfade({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15, ease: easeOut }}
        className={className}
        style={{ display: "inline-block" }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

/* Re-export AnimatePresence for consumer convenience */
export { AnimatePresence, motion };
