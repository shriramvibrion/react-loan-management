import React from "react";
import "./Input.css";

export default function Input({
  label,
  error,
  type = "text",
  id,
  fullWidth = true,
  className = "",
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`ds-input-wrapper ${fullWidth ? "ds-input-full" : ""} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ds-input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`ds-input ${error ? "ds-input-error" : ""}`}
        {...props}
      />
      {error && <span className="ds-input-error-text">{error}</span>}
    </div>
  );
}
