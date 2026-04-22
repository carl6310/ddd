"use client";

import { useLayoutEffect, useRef } from "react";

type AutoGrowTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AutoGrowTextarea({ className, ...props }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      className={className ? `auto-grow-textarea ${className}` : "auto-grow-textarea"}
    />
  );
}
