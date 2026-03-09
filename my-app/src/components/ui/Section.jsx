/**
 * Reusable detail section wrapper used across loan detail pages.
 * Supports blue (user) and orange (admin) accent variants.
 */
export default function Section({ title, variant = "blue", children, style }) {
  const accent = variant === "orange" ? "#f97316" : "#6366f1";
  const accentLight = variant === "orange" ? "rgba(249,115,22,0.06)" : "rgba(99,102,241,0.04)";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03)",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: accent,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: `1px solid ${accentLight}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
        {title}
      </div>
      {children}
    </div>
  );
}
