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
        padding: "40px 20px",
        ...style,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 8, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#111827",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            color: "#5a6578",
            marginBottom: action ? 16 : 0,
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
