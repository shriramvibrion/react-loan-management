import { useState } from "react";
import { PageBg } from "../App";

export default function UserLogin({ navigate, onLoginSuccess }) {
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
      const res = await fetch("http://localhost:5000/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Login successful.");
        const email = data?.user?.email || form.email;
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess(email);
        } else {
          navigate("documentation");
        }
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (err) {
      setMessage("Server error. Please try again.");
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
        />
        <input
          className="input-field"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
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