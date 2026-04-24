import type { HTMLAttributes, ReactNode } from "react";

type CalloutTone = "info" | "success" | "warning" | "danger";

export function Callout({
  title,
  children,
  action,
  className = "",
  tone = "info",
  ...props
}: HTMLAttributes<HTMLElement> & {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: CalloutTone;
}) {
  return (
    <aside className={`ui-callout ui-callout-${tone} ${className}`.trim()} {...props}>
      <div className="ui-callout-copy">
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
      {action ? <div className="ui-callout-action">{action}</div> : null}
    </aside>
  );
}
