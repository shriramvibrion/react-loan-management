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
    borderRadius: 9,
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 700,
    letterSpacing: 1,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
    textDecoration: "none",
    borderWidth: 0,
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #2b7de9, #1a5fc4)",
      color: "#fff",
    },
    secondary: {
      background: "rgba(255,255,255,0.9)",
      color: "#1a5fc4",
      border: "1px solid rgba(26,95,196,0.35)",
      boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
    },
    danger: {
      background: "linear-gradient(135deg, #ef4444, #b91c1c)",
      color: "#fff",
    },
    ghost: {
      background: "transparent",
      color: "#1f2933",
      boxShadow: "none",
    },
  };

  const sizes = {
    sm: { padding: "8px 12px", fontSize: 12 },
    md: { padding: "10px 16px", fontSize: 13 },
    lg: { padding: "12px 20px", fontSize: 14 },
  };

  const finalStyle = {
    ...base,
    ...(variants[variant] || variants.primary),
    ...(sizes[size] || sizes.md),
    ...style,
  };

  return <Component style={finalStyle} {...props} />;
}

