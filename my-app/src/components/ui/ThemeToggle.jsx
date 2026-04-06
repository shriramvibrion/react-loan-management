import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ style }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1e293b, #334155)"
          : "linear-gradient(135deg, #f8fafc, #e2e8f0)",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(15,23,42,0.1)",
        borderRadius: 12,
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        fontWeight: 600,
        color: isDark ? "#f1f5f9" : "#334155",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: isDark
          ? "0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(15,23,42,0.08)",
        ...style,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>
        {isDark ? "☀️" : "🌙"}
      </span>
      <span style={{ fontSize: 12 }}>
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
