import { useState } from "react";
import { PageBg } from "../App";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { loginAdmin } from "../services/authService";
import { ROLES } from "../constants";
import PasswordInput from "../components/ui/PasswordInput";
import ThemeToggle from "../components/ui/ThemeToggle";

export default function AdminLogin({ navigate, onLoginSuccess }) {
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      toast.warning("Please enter both Email and Password.");
      return;
    }

    setLoading(true);

    try {
      await loginAdmin(form.email, form.password);
      login(form.email, ROLES.ADMIN);
      sessionStorage.setItem("adminEmail", form.email);
      setForm({ email: "", password: "" });
      toast.success("Admin login successful.");
      if (onLoginSuccess) onLoginSuccess();
      else navigate("admin-dashboard");
    } catch (err) {
      toast.error(err.message || "Invalid credentials. Please check your Email and Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg pageClass="auth-page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -4 }}>
          <ThemeToggle />
        </div>
        <div className="card-title-orange">Admin Login</div>
        <div style={{ marginTop: -6, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          Secure access for review workflows
        </div>

        <input
          className="input-field input-field-orange"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <PasswordInput
          className="input-field input-field-orange"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
          {/* Admin registration disabled - Admins must be created manually */}
        </div>

        <button className="home-btn-orange" onClick={() => navigate("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
