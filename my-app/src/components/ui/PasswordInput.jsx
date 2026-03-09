import { useState } from "react";

/**
 * Password input with show/hide toggle.
 * Replaces duplicated password toggle UI from 4+ components.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  className = "input-field",
  style,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        className={className}
        placeholder={placeholder}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        style={{ paddingRight: "40px", ...style }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
          padding: "0",
          width: "30px",
          height: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showPassword ? (
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
            <line x1="3" y1="21" x2="21" y2="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
