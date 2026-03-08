export default function Badge({ tone = "neutral", children, style }) {
  const tones = {
    neutral: { background: "#e5e7eb", color: "#374151" },
    success: { background: "#dcfce7", color: "#166534" },
    warning: { background: "#fef3c7", color: "#92400e" },
    danger: { background: "#fee2e2", color: "#991b1b" },
    info: { background: "#e0edff", color: "#1d4ed8" },
  };

  const toneStyle = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.3,
        ...toneStyle,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

