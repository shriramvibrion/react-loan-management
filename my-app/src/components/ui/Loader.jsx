/**
 * Spinner loader component.
 */
export default function Loader({ size = 28, color = "#6366f1", text, style }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}1a`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      {text && (
        <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
          {text}
        </div>
      )}
    </div>
  );
}
