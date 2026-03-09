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
      }}
    >
      <span style={{ color: "#5a6578", minWidth: 140 }}>{label}:</span>
      <span style={{ color: "#2d3748" }}>{value ?? "-"}</span>
    </div>
  );
}
