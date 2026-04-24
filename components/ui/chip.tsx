import type { HTMLAttributes, ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "success" | "warning" | "danger" | "stale";

export function Chip({
  children,
  className = "",
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return (
    <span className={`ui-chip ui-chip-${tone} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

export function StatusDot({
  className = "",
  tone = "neutral",
  label,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  label?: string;
}) {
  return (
    <span className={`ui-status-dot ui-status-dot-${tone} ${className}`.trim()} aria-label={label} {...props} />
  );
}
