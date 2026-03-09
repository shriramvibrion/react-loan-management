export default function DashboardLayout({ children, variant = "blue" }) {
  const isOrange = variant === "orange";

  const outerBackground = isOrange
    ? "radial-gradient(900px 600px at 18% 10%, rgba(255,138,51,0.20) 0%, rgba(255,138,51,0) 55%), linear-gradient(160deg, #f8fafc 0%, #f3f4f6 45%, #eef2f7 100%)"
    : "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)";

  const textColor = isOrange ? "#2d3748" : "#0f172a";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "22px 18px",
        boxSizing: "border-box",
        background: outerBackground,
        overflowX: "hidden",
        overflowY: "auto",
        color: textColor,
      }}
    >
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.12)",
          borderRadius: 18,
          padding: 18,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

