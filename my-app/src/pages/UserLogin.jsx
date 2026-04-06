import { useState } from "react";
import { PageBg } from "../App";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { loginUser } from "../services/authService";
import { ROLES } from "../constants";
import PasswordInput from "../components/ui/PasswordInput";

export default function UserLogin({ navigate, onLoginSuccess }) {
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    setMessage("");

    if (!form.email || !form.password) {
      setMessage("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser(form.email, form.password);
      const email = data?.user?.email || form.email;
      login(email, ROLES.USER);
      toast.success(data.message || "Login successful.");
      if (onLoginSuccess) onLoginSuccess(email);
      else navigate("documentation");
    } catch (err) {
      setMessage(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg pageClass="auth-page">
      <div className="card">
        <div className="card-title-blue">User Login</div>

        <input
          className="input-field"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <PasswordInput
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {message && (
          <div
            className="link-row"
            style={{
              color: "#b45309",
              background: "rgba(255,247,237,0.78)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 10,
              padding: "8px 10px",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        <button className="btn-blue" onClick={handleLogin} disabled={loading}>
          {loading ? "Verifying..." : "Login"}
        </button>

        <div className="link-row">
          Not registered ?{" "}
          <button className="link-blue" onClick={() => navigate("user-register")}>
            Register
          </button>
        </div>

        <button className="home-btn-blue" onClick={() => navigate("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
