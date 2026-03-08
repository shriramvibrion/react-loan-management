import { useState } from "react";
import { PageBg } from "../App";

export default function AdminLogin({ navigate, onLoginSuccess }) {
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── POST credentials to Flask for verification ────────────────
  const handleLogin = async () => {

    // Front-end validation
    if (!form.email || !form.password) {
      alert("⚠️ Please enter both Email and Password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:    form.email,
          password: form.password,
        }),
      });

      await response.json();

      if (response.ok) {
        setForm({ email: "", password: "" });
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
        } else {
          navigate("admin-dashboard");
        }
      } else {
        // ❌ Wrong email or password
        alert("❌ Invalid credentials. Please check your Email and Password.");
      }

    } catch (err) {
      alert("⚠️ Cannot connect to server. Make sure Flask is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <PageBg>
      <div className="card">
        <div className="card-title-orange">Admin Login</div>

        <input
          className="input-field input-field-orange"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        <div style={{ position: "relative", width: "100%" }}>
          <input
            className="input-field input-field-orange"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ paddingRight: "40px" }}
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
              fontFamily: "inherit",
              textAlign: "center",
              color: "#666",
              padding: "0",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {showPassword ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
                <line x1="3" y1="21" x2="21" y2="3" />
              </svg>
            )}
          </button>
        </div>

        <button
          className="btn-orange"
          onClick={handleLogin}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Verifying..." : "Login"}
        </button>

        <div className="link-row">
          Don't have an account?{" "}
          <button className="link-orange" onClick={() => navigate("admin-register")}>
            Register
          </button>
        </div>

        <button className="home-btn-orange" onClick={() => navigate("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}

