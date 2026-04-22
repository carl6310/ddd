import React from "react";

export function AccordionCard({
  title,
  description,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={`accordion-card stack ${className}`} open={defaultOpen}>
      <summary className="accordion-head">
        <div className="accordion-title-block">
          <h4>{title}</h4>
          {description ? <p className="subtle">{description}</p> : null}
        </div>
        <div className="accordion-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </summary>
      <div className="accordion-body stack">{children}</div>
    </details>
  );
}
