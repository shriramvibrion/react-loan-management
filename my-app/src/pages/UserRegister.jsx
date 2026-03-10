import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageBg } from "../App";
import { useToast } from "../context/ToastContext";
import { registerUser } from "../services/authService";
import { isValidEmail } from "../utils/validators";
import PasswordInput from "../components/ui/PasswordInput";

export default function UserRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setMessage("");

    if (!form.name || !form.email || !form.password || !form.phone || !form.city) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setMessage("Password must contain at least one letter and one number.");
      return;
    }

    try {
      setLoading(true);
      const data = await registerUser(form);
      toast.success(data.message || "Registered successfully.");
      navigate("/user/login");
    } catch (err) {
      setMessage(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBg>
      <div className="card">
        <div className="card-title-blue">User Register</div>

        <input
          className="input-field"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordInput
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />

        {message && (
          <div className="link-row" style={{ color: "#e06d0a" }}>
            {message}
          </div>
        )}

        <button className="btn-blue" onClick={handleRegister} disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="link-row">
          Already have an account?{" "}
          <button className="link-blue" onClick={() => navigate("/user/login")}>
            Login
          </button>
        </div>

        <button className="home-btn-blue" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}
