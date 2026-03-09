import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBg } from "../App";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { loginUser } from "../services/authService";
import { ROLES } from "../constants";
import PasswordInput from "../components/ui/PasswordInput";

export default function UserLogin() {
  const navigate = useNavigate();
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
      navigate("/documentation");
    } catch (err) {
      setMessage(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg>
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
          <div className="link-row" style={{ color: "#e06d0a" }}>
            {message}
          </div>
        )}

        <button className="btn-blue" onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="link-row">
          Not registered ?{" "}
          <button className="link-blue" onClick={() => navigate("/user/register")}>
            Register
          </button>
        </div>

        <button className="home-btn-blue" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
