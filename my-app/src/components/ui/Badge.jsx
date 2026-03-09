export default function Badge({ tone = "neutral", children, style }) {
  const tones = {
    neutral: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    success: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
    warning: { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" },
    danger: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" },
    info: { background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" },
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
        fontWeight: 700,
        letterSpacing: 0.3,
        ...toneStyle,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

