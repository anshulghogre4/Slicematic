import type { HTMLAttributes, ReactNode } from "react";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: StatusTone;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function StatusPill({ children, className, tone = "neutral", ...props }: StatusPillProps) {
  return (
    <span {...props} className={classNames("sui-status-pill", tone !== "neutral" && `sui-status-pill--${tone}`, className)}>
      {children}
    </span>
  );
}
