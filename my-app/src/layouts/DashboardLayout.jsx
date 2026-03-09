export default function DashboardLayout({ children, variant = "blue" }) {
  const isOrange = variant === "orange";

  const outerBackground = isOrange
    ? "linear-gradient(135deg, #faf5ff 0%, #fef7f0 30%, #fff7ed 60%, #f8fafc 100%)"
    : "linear-gradient(135deg, #f0f4ff 0%, #eef2ff 30%, #e8ecff 60%, #f8fafc 100%)";

  const textColor = isOrange ? "#1e293b" : "#0f172a";
  const accentColor = isOrange ? "#f97316" : "#6366f1";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "24px 20px",
        boxSizing: "border-box",
        background: outerBackground,
        overflowX: "hidden",
        overflowY: "auto",
        color: textColor,
        position: "relative",
      }}
    >
      {/* Subtle decorative gradient orbs */}
      <div style={{
        position: "fixed",
        top: "-10%",
        right: "-5%",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: isOrange
          ? "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        bottom: "-15%",
        left: "-5%",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: isOrange
          ? "radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div
        style={{
          width: "min(1200px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
          borderRadius: 20,
          padding: 24,
          backdropFilter: "blur(20px) saturate(1.3)",
          WebkitBackdropFilter: "blur(20px) saturate(1.3)",
          position: "relative",
          zIndex: 1,
          animation: "fadeIn 0.4s ease both",
          borderTop: `2px solid ${accentColor}18`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

