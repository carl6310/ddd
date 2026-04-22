"use client";

type ContainedScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

export function ContainedScrollArea({
  children,
  onWheelCapture,
  className,
  ...props
}: ContainedScrollAreaProps) {
  return (
    <div
      {...props}
      className={className ? `contained-scroll-area ${className}` : "contained-scroll-area"}
      onWheelCapture={(event) => {
        const element = event.currentTarget;
        const canScrollY = element.scrollHeight > element.clientHeight;
        const canScrollX = element.scrollWidth > element.clientWidth;

        if (!canScrollY && !canScrollX) {
          onWheelCapture?.(event);
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (canScrollY && event.deltaY !== 0) {
          element.scrollTop += event.deltaY;
        }

        if (canScrollX && event.deltaX !== 0) {
          element.scrollLeft += event.deltaX;
        }

        onWheelCapture?.(event);
      }}
    >
      {children}
    </div>
  );
}
