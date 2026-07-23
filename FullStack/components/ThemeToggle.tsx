"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "slicematic_theme";

export type DaisyTheme = "slicematic" | "slicematic-dark";

function normalizeTheme(value: string | null): DaisyTheme {
  if (value === "slicematic-dark" || value === "dark") return "slicematic-dark";
  return "slicematic";
}

function readTheme(): DaisyTheme {
  if (typeof window === "undefined") return "slicematic";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return normalizeTheme(stored);
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "slicematic-dark"
    : "slicematic";
}

function applyTheme(theme: DaisyTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Keep dataset.theme in sync for any legacy CSS selectors
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<DaisyTheme>("slicematic");

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: DaisyTheme = theme === "slicematic-dark" ? "slicematic" : "slicematic-dark";
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme === "slicematic-dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
