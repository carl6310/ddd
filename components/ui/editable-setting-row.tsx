import React from "react";
import { AutoGrowTextarea } from "./auto-grow-textarea";

export function GroupedSettings({
  children,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={`apple-settings-group ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function SettingRow({
  label,
  children,
  className = "",
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`apple-setting-row ${onClick ? "is-clickable" : ""} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="apple-setting-label">{label}</div>
      <div className="apple-setting-value">{children}</div>
    </div>
  );
}

export function EditableSettingRow({
  label,
  value,
  onChange,
  multiline = true,
  rows = 3,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(value);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTempValue(value);
  }, [value]);

  React.useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsEditing(false);
      if (tempValue !== value) {
        onChange(tempValue);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isEditing, onChange, tempValue, value]);

  function commit() {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  }

  function cancel() {
    setTempValue(value);
    setIsEditing(false);
  }

  const displayValue = value || placeholder || "点击编辑...";

  return (
    <SettingRow label={label} className={className} onClick={isEditing ? undefined : () => setIsEditing(true)}>
      <div ref={wrapperRef} onClick={isEditing ? (event) => event.stopPropagation() : undefined}>
        {isEditing ? (
          multiline ? (
            <div className="inline-edit-textarea-wrapper apple-setting-edit">
              <AutoGrowTextarea
                value={tempValue}
                onChange={(event) => setTempValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    cancel();
                  }
                }}
                rows={rows}
                placeholder={placeholder}
                autoFocus={true}
              />
            </div>
          ) : (
            <input
              ref={inputRef}
              value={tempValue}
              onChange={(event) => setTempValue(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commit();
                }
                if (event.key === "Escape") {
                  cancel();
                }
              }}
              className="inline-edit-input apple-setting-edit"
              placeholder={placeholder}
            />
          )
        ) : (
          <div className={`inline-edit-view ${multiline ? "textarea-view" : ""} ${!value ? "empty" : ""} apple-setting-edit`}>
            {displayValue}
          </div>
        )}
      </div>
    </SettingRow>
  );
}
