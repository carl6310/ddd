import type { HTMLAttributes, ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`ui-section-header ${className}`.trim()} {...props}>
      <div className="ui-section-header-copy">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ui-section-header-actions">{actions}</div> : null}
    </div>
  );
}
