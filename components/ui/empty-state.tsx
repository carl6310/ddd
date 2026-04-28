import type { HTMLAttributes, ReactNode } from "react";

export function EmptyState({
  title,
  children,
  action,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`ui-empty-state ${className}`.trim()} {...props}>
      <h3>{title}</h3>
      {children ? <div className="ui-empty-state-body">{children}</div> : null}
      {action ? <div className="ui-empty-state-action">{action}</div> : null}
    </div>
  );
}
