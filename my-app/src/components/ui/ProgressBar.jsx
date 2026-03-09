/**
 * Reusable progress bar component for analytics display.
 */
export default function ProgressBar({
  percent = 0,
  color = "#10b981",
  height = 10,
  label,
  showPercent = true,
  style,
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div style={style}>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {label}
          </span>
          {showPercent && (
            <span style={{ fontSize: 13, fontWeight: 700, color }}>
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          height,
          borderRadius: 999,
          background: "#f1f5f9",
          overflow: "hidden",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: 999,
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 8px ${color}33`,
          }}
        />
      </div>
    </div>
  );
}
