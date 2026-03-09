/**
 * Reusable progress bar component for analytics display.
 */
export default function ProgressBar({
  percent = 0,
  color = "#16a34a",
  height = 12,
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
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
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
          background: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
