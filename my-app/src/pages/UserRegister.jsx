import { useState } from "react";
import { PageBg } from "../App";

export default function UserRegister({ navigate }) {
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

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Registered successfully.");
        // Optionally navigate to login after short delay
        // setTimeout(() => navigate("user-login"), 800);
      } else {
        setMessage(data.error || "Registration failed.");
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
        <input
          className="input-field"
          placeholder="Password"
          type="password"
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
          <button className="link-blue" onClick={() => navigate("user-login")}>
            Login
          </button>
        </div>

        <button className="home-btn-blue" onClick={() => navigate("index")}>
          Home
        </button>
      </div>
    </PageBg>
  );
}