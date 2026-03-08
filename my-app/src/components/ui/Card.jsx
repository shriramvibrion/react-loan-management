export default function Card({ children, style }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        borderRadius: 14,
        padding: "12px 14px",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

