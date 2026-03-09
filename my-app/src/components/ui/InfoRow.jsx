/**
 * Reusable label-value row used across detail views.
 */
export default function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 8,
        fontSize: 14,
        padding: "6px 0",
        borderBottom: "1px solid rgba(15,23,42,0.04)",
      }}
    >
      <span style={{ color: "#64748b", minWidth: 150, fontWeight: 500, fontSize: 13 }}>{label}</span>
      <span style={{ color: "#1e293b", fontWeight: 600 }}>{value ?? "—"}</span>
    </div>
  );
}
