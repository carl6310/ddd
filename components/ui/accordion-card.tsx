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
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <article className={`accordion-card ${isOpen ? "is-open" : ""} ${className}`}>
      <button className="accordion-head" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <div className="accordion-title-block">
          <h4>{title}</h4>
          {description ? <p className="subtle">{description}</p> : null}
        </div>
        <div className="accordion-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>
      {isOpen ? <div className="accordion-body stack">{children}</div> : null}
    </article>
  );
}
