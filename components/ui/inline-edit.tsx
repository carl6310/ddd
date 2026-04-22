"use client";

import React, { useState, useRef, useEffect } from "react";
import { AutoGrowTextarea } from "./auto-grow-textarea";

interface InlineEditProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineTextEdit({ value, onChange, placeholder = "点击编辑...", className = "" }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`inline-edit-input ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      className={`inline-edit-view ${!value ? "empty" : ""} ${className}`} 
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
    </div>
  );
}

export function InlineTextAreaEdit({ value, onChange, placeholder = "点击编辑...", className = "", rows = 3 }: InlineEditProps & { rows?: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        if (tempValue !== value) {
          onChange(tempValue);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, tempValue, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div ref={wrapperRef} className={`inline-edit-textarea-wrapper ${className}`}>
        <AutoGrowTextarea
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder={placeholder}
          autoFocus={true}
        />
      </div>
    );
  }

  return (
    <div 
      className={`inline-edit-view textarea-view ${!value ? "empty" : ""} ${className}`} 
      onClick={() => setIsEditing(true)}
    >
      {value ? (
        value.split("\\n").map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < value.split("\\n").length - 1 && <br />}
          </React.Fragment>
        ))
      ) : placeholder}
    </div>
  );
}
