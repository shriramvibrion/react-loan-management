import { useState } from "react";
import { PageBg } from "../App";

export default function AdminLogin({ navigate, onLoginSuccess }) {
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

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

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Welcome! Admin login successful.`);
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
        <input
          className="input-field input-field-orange"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

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