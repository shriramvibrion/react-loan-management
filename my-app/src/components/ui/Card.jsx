export default function Card({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 14,
        padding: "16px 18px",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

