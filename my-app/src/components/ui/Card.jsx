import React from "react";

export default function Card({ children, className = "", padding = "24px", ...props }) {
  return (
    <div
      className={`ds-card ${className}`}
      style={{
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        padding: padding,
        border: "1px solid #e2e8f0",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
