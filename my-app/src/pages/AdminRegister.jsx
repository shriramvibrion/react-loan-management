import { useState } from "react";
import { PageBg } from "../App";
import { useToast } from "../context/ToastContext";
import { registerAdmin } from "../services/authService";
import PasswordInput from "../components/ui/PasswordInput";
import ThemeToggle from "../components/ui/ThemeToggle";

export default function AdminRegister({ navigate }) {
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const go = (target) => {
    if (typeof navigate === "function") {
      navigate(target);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      setMessage("All fields are required.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const data = await registerAdmin({
        username: form.username,
        email: form.email,
        password: form.password,
      });

      const successMessage = data?.message || "Admin registered successfully.";
      setMessage(`✅ ${successMessage}`);
      toast.success(successMessage);
      setForm({ username: "", email: "", password: "" });

      setTimeout(() => {
        go("admin-login");
      }, 1200);
    } catch (err) {
      const errorMessage = err?.message || "Registration failed.";
      setMessage(errorMessage);
      toast.error(errorMessage);
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
        <div className="card-title-orange">Admin Registration</div>
        <div style={{ marginTop: -6, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          Create an administrator account for review workflows
        </div>

        <input
          className="input-field input-field-orange"
          placeholder="Name"
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />
        <input
          className="input-field input-field-orange"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />
        <PasswordInput
          className="input-field input-field-orange"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />

        {message && (
          <p style={{ padding: "14px 12px", textAlign: "center", color: message.startsWith("✅") ? "#166534" : "#9f1239", fontWeight: 700, fontSize: "14px", background: message.startsWith("✅") ? "rgba(220,252,231,0.78)" : "rgba(255,241,242,0.78)", border: message.startsWith("✅") ? "1px solid rgba(22,163,74,0.24)" : "1px solid rgba(244,63,94,0.24)", borderRadius: 10 }}>
            {message}
          </p>
        )}

        <button className="btn-orange" onClick={handleRegister} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Registering..." : "Register"}
        </button>

        <button
          className="btn-orange"
          onClick={() => go("admin-login")}
          style={{ marginBottom: "12px" }}
        >
          Back to Admin Login
        </button>

        <div className="link-row">
          Already have an account?{" "}
          <button className="link-orange" onClick={() => go("admin-login")}>
            Login
          </button>
        </div>

        <button className="home-btn-orange" onClick={() => go("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
