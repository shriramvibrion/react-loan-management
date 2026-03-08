import React from 'react';
import './Button.css'; // Let's use clean separate css or inline objects for the design system

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // primary, secondary, danger, ghost
  size = 'md', // sm, md, lg
  disabled = false,
  loading = false,
  className = '',
  fullWidth = false,
  ...props
}) {
  const baseClass = `ds-button ds-button-${variant} ds-button-${size}`;
  const widthClass = fullWidth ? 'ds-button-full' : '';
  const loadingClass = loading ? 'ds-button-loading' : '';
  
  return (
    <button
      type={type}
      className={`${baseClass} ${widthClass} ${loadingClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="ds-button-spinner" />
      ) : null}
      <span className="ds-button-content">{children}</span>
    </button>
  );
}
