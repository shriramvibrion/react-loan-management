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
        background: "linear-gradient(135deg, rgba(238,243,252,0.82), rgba(255,255,255,0.8))",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        border: "1px solid rgba(255,255,255,0.72)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.35) inset",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
