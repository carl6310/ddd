import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  ghost: "ghost-button",
  danger: "danger-button",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "button-size-sm",
  md: "button-size-md",
  lg: "button-size-lg",
};

export function Button({
  children,
  className = "",
  size = "md",
  variant = "secondary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button type={type} className={`${variantClassName[variant]} ${sizeClassName[size]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  "aria-label": string;
  size?: Exclude<ButtonSize, "lg">;
}) {
  return (
    <button type={type} className={`icon-button icon-button-size-${size} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className = "",
  size = "md",
  variant = "secondary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <a className={`${variantClassName[variant]} ${sizeClassName[size]} ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}
