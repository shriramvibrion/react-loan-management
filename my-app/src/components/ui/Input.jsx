/**
 * Styled input component matching the design system.
 */
export default function Input({ style, ...props }) {
  return (
    <input
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        fontSize: "14px",
        color: "#1e293b",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    />
  );
}
