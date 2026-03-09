/**
 * Empty state placeholder component.
 */
export default function EmptyState({
  icon = "📋",
  title = "Nothing here yet",
  description,
  action,
  style,
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        animation: "fadeIn 0.4s ease",
        ...style,
      }}
    >
      <div style={{
        fontSize: 52,
        marginBottom: 12,
        lineHeight: 1,
        filter: "grayscale(0.2)",
      }}>{icon}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 8,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            color: "#64748b",
            marginBottom: action ? 20 : 0,
            maxWidth: 400,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
