import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBg } from "../App";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { loginAdmin } from "../services/authService";
import { ROLES } from "../constants";
import PasswordInput from "../components/ui/PasswordInput";

export default function AdminLogin() {
  const navigate = useNavigate();
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
      setForm({ email: "", password: "" });
      toast.success("Admin login successful.");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.message || "Invalid credentials. Please check your Email and Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg>
      <div className="card">
        <div className="card-title-orange">Admin Login</div>

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
          Don't have an account?{" "}
          <button className="link-orange" onClick={() => navigate("/admin/register")}>
            Register
          </button>
        </div>

        <button className="home-btn-orange" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
