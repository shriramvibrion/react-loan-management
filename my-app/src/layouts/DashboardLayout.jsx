import { useTheme } from "../context/ThemeContext";
import Button from "../components/ui/Button";

export default function DashboardLayout({ children, variant = "blue", title, onBack }) {
  const isOrange = variant === "orange";
  const { isDark } = useTheme();

  const outerBackground = isDark
    ? (isOrange
        ? "linear-gradient(135deg, rgba(26,18,5,0.52) 0%, rgba(28,16,7,0.52) 30%, rgba(30,20,10,0.52) 60%, rgba(15,23,42,0.56) 100%)"
        : "linear-gradient(135deg, rgba(12,14,26,0.5) 0%, rgba(15,17,32,0.5) 30%, rgba(13,16,36,0.5) 60%, rgba(15,23,42,0.54) 100%)")
    : (isOrange
      ? "linear-gradient(135deg, rgba(248,250,252,0.42) 0%, rgba(241,245,249,0.44) 40%, rgba(238,242,247,0.46) 100%)"
      : "linear-gradient(135deg, rgba(248,250,252,0.42) 0%, rgba(241,245,249,0.44) 40%, rgba(238,242,247,0.46) 100%)");

  const textColor = isDark ? "#e2e8f0" : (isOrange ? "#1e293b" : "#0f172a");
  const accentColor = isOrange ? "#f97316" : "#6366f1";
  const panelBackground = isDark
    ? "rgba(15, 23, 42, 0.86)"
    : "rgba(245,247,251,0.84)";
  const panelBorder = isDark
    ? "1px solid rgba(99, 102, 241, 0.15)"
    : "1px solid rgba(203,213,225,0.55)";
  const orbColor1 = "transparent";
  const orbColor2 = "transparent";

  return (
    <div
      className="page-bg-image"
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
        background: orbColor1,
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
        background: orbColor2,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div
        style={{
          width: "min(1200px, 96vw)",
          margin: "0 auto",
          background: panelBackground,
          border: panelBorder,
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
          borderRadius: 20,
          padding: "24px clamp(12px, 3vw, 24px)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          position: "relative",
          zIndex: 1,
          animation: "fadeIn 0.4s ease both",
          borderTop: `1px solid ${accentColor}12`,
          overflowX: "hidden",
        }}
      >
        {/* Header with title and back button */}
        {(title || onBack) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>{title && <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: isOrange ? "#ea580c" : "#6366f1", fontFamily: "'Montserrat', sans-serif" }}>{title}</h1>}</div>
            {onBack && <Button variant="secondary" size="sm" onClick={onBack} style={{ borderColor: isOrange ? "#fed7aa" : "#c7d2fe", color: isOrange ? "#ea580c" : "#6366f1" }}>← Back</Button>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

