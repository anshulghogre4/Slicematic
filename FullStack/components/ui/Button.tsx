import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  isLoading = false,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isLoading || props["aria-busy"]}
      className={classNames("sui-button", `sui-button--${variant}`, `sui-button--${size}`, className)}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading ? <span className="sui-button__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
