import { createElement, type HTMLAttributes, type ReactNode } from "react";

type SurfaceTone = "stage" | "panel" | "card" | "muted";
type SurfaceElement = "section" | "aside" | "article" | "div";

export function Surface({
  children,
  className = "",
  tone = "stage",
  as = "section",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: SurfaceTone;
  as?: SurfaceElement;
}) {
  return createElement(as, { className: `ui-surface ui-surface-${tone} ${className}`.trim(), ...props }, children);
}

export function Panel({
  children,
  className = "",
  as = "section",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode; as?: SurfaceElement }) {
  return createElement(as, { className: `ui-panel ${className}`.trim(), ...props }, children);
}

export function Card({
  children,
  className = "",
  as = "article",
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode; as?: SurfaceElement }) {
  return createElement(as, { className: `ui-card ${className}`.trim(), ...props }, children);
}
