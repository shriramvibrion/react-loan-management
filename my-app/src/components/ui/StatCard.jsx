import Card from "./Card";

/**
 * Reusable stat/summary card for dashboards.
 */
export default function StatCard({ label, value, accent = "#1a5fc4", style }) {
  return (
    <Card style={style}>
      <div style={{ fontSize: 12, color: "#5a6578", fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: accent,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </Card>
  );
}
