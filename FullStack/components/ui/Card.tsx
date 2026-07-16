import type { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "soft" | "accent" | "danger";

export type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "section" | "article" | "div";
  tone?: CardTone;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Card({ as: Element = "section", children, className, tone = "default", ...props }: CardProps) {
  return (
    <Element {...props} className={classNames("sui-card", tone !== "default" && `sui-card--${tone}`, className)}>
      {children}
    </Element>
  );
}
