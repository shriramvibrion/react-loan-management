/**
 * Spinner loader component.
 */
export default function Loader({ size = 28, color = "#2b7de9", text, style }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 20,
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}33`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      {text && (
        <div style={{ fontSize: 14, color: "#5a6578", fontWeight: 700 }}>
          {text}
        </div>
      )}
    </div>
  );
}
