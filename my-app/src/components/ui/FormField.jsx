/**
 * Reusable form field wrapper with label and required indicator.
 */
export default function FormField({
  label,
  required,
  hint,
  error,
  children,
  style,
}) {
  return (
    <div style={style}>
      {label && (
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
            marginBottom: 6,
            display: "block",
          }}
        >
          {label}
          {required && <span style={{ color: "#ef4444" }}> *</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
}
