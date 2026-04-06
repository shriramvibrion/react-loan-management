export default function Button({
  variant = "primary",
  size = "md",
  as = "button",
  style,
  ...props
}) {
  const Component = as;

  const base = {
    border: "none",
    borderRadius: 10,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    letterSpacing: 0.3,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)",
    transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
    textDecoration: "none",
    borderWidth: 0,
    position: "relative",
    overflow: "hidden",
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
      color: "var(--text-on-accent)",
      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3), 0 1px 2px rgba(0,0,0,0.05)",
    },
    secondary: {
      background: "rgba(255,255,255,0.95)",
      color: "#4f46e5",
      border: "1.5px solid #e0e7ff",
      boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
    },
    danger: {
      background: "linear-gradient(135deg, #f43f5e, #e11d48)",
      color: "var(--text-on-accent)",
      boxShadow: "0 4px 14px rgba(244, 63, 94, 0.3)",
    },
    ghost: {
      background: "transparent",
      color: "#475569",
      boxShadow: "none",
    },
  };

  const sizes = {
    sm: { padding: "8px 14px", fontSize: 12 },
    md: { padding: "10px 18px", fontSize: 13 },
    lg: { padding: "12px 24px", fontSize: 14 },
  };

  const finalStyle = {
    ...base,
    ...(variants[variant] || variants.primary),
    ...(sizes[size] || sizes.md),
    ...style,
  };

  return <Component style={finalStyle} {...props} />;
}

