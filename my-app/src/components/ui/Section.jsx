/**
 * Reusable detail section wrapper used across loan detail pages.
 * Supports blue (user) and orange (admin) accent variants.
 */
export default function Section({ title, variant = "blue", children, style }) {
  const accent = variant === "orange" ? "#FF8A33" : "#1a5fc4";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: accent,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
