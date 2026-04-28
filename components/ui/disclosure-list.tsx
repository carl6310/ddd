import React from "react";

export function DisclosureList({
  children,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={`apple-disclosure-list ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function DisclosureRow({
  title,
  description,
  meta,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const canExpand = Boolean(children);

  return (
    <div className={`apple-disclosure-row ${isOpen ? "is-open" : ""} ${className}`.trim()}>
      <button
        type="button"
        className="apple-disclosure-head"
        aria-expanded={canExpand ? isOpen : undefined}
        onClick={() => {
          if (canExpand) {
            setIsOpen((current) => !current);
          }
        }}
      >
        <div className="apple-disclosure-copy">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        <div className="apple-disclosure-trailing">
          {meta}
          {canExpand ? (
            <svg className="apple-disclosure-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          ) : null}
        </div>
      </button>
      {isOpen ? <div className="apple-disclosure-body">{children}</div> : null}
    </div>
  );
}
