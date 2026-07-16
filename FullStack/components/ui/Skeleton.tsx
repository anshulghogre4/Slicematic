import type { HTMLAttributes } from "react";

type SkeletonVariant = "line" | "block" | "circle";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Skeleton({ className, variant = "line", ...props }: SkeletonProps) {
  return <div aria-hidden="true" {...props} className={classNames("sui-skeleton", `sui-skeleton--${variant}`, className)} />;
}
