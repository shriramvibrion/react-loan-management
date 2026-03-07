import { useState } from "react";
import { PageBg } from "../App";

export default function AdminRegister({ navigate }) {
  const [form, setForm]       = useState({ usernamename: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // ── POST to Flask backend ─────────────────────────────────────
  const handleRegister = async () => {

    // Basic front-end validation
    if (!form.username || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username:     form.username,
          email:    form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success → show message and redirect to admin login
        setMessage(data.message || "Admin registered successfully!");
        setForm({ username: "", email: "", password: "" });
        setTimeout(() => navigate("admin-login"), 1500);
      } else {
        // Server returned an error (e.g. 400, 409 email already exists)
        setError(data.message || "Registration failed. Please try again.");
      }

    } catch (err) {
      // Network error — Flask server not running or wrong URL
      setError("Cannot connect to server. Make sure Flask is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────

  return (
    <PageBg>
      <div className="card">
        <div className="card-title-orange">Admin Register</div>

        <input
          className="input-field input-field-orange"
          placeholder="Name"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="input-field input-field-orange"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input-field input-field-orange"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {/* Success message */}
        {message && (
          <p style={{ color: "#2e7d32", fontSize: "13px", textAlign: "center", fontWeight: 600 }}>
            ✅ {message}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p style={{ color: "#c62828", fontSize: "13px", textAlign: "center", fontWeight: 600 }}>
            ⚠️ {error}
          </p>
        )}

        <button
          className="btn-orange"
          onClick={handleRegister}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="link-row">
          Already have an account?{" "}
          <button className="link-orange" onClick={() => navigate("admin-login")}>
            Login
          </button>
        </div>

        <button className="home-btn-orange" onClick={() => navigate("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}