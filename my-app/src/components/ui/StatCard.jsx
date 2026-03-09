import Card from "./Card";

export default function StatCard({ label, value, accent = "#6366f1", style }) {
  return (
    <Card style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.97))",
      borderLeft: `3px solid ${accent}`,
      ...style
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: accent,
          marginTop: 6,
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
    </Card>
  );
}
