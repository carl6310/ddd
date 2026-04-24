"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface PopoverProps {
  open: boolean;
  anchorLabel: string;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Popover({ open, anchorLabel, title, children, onClose, className = "" }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className={`ui-popover ${className}`.trim()}
      role="dialog"
      aria-label={title ? undefined : anchorLabel}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? <h3 id={titleId}>{title}</h3> : null}
      <div className="ui-popover-body">{children}</div>
    </div>
  );
}
