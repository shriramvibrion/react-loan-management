import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBg } from "../App";
import { useToast } from "../context/ToastContext";
import { registerAdmin } from "../services/authService";
import PasswordInput from "../components/ui/PasswordInput";

export default function AdminRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await registerAdmin(form);
      setMessage(data.message || "Admin registered successfully!");
      toast.success(data.message || "Admin registered successfully!");
      setForm({ username: "", email: "", password: "" });
      setTimeout(() => navigate("/admin/login"), 1500);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg>
      <div className="card">
        <div className="card-title-orange">Admin Register</div>

        <input
          className="input-field input-field-orange"
          placeholder="Name"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="input-field input-field-orange"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordInput
          className="input-field input-field-orange"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {message && (
          <p style={{ color: "#2e7d32", fontSize: "13px", textAlign: "center", fontWeight: 600 }}>
            ✅ {message}
          </p>
        )}

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
          <button className="link-orange" onClick={() => navigate("/admin/login")}>
            Login
          </button>
        </div>

        <button className="home-btn-orange" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
