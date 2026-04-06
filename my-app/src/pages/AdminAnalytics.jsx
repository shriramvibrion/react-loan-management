import { useEffect, useState } from "react";
import { fetchAdminAnalytics } from "../services/loanService";
import DashboardLayout from "../layouts/DashboardLayout";
import Loader from "../components/ui/Loader";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#f97316", "#6366f1", "#16a34a", "#ef4444", "#eab308", "#06b6d4", "#ec4899"];

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
};

export default function AdminAnalytics({ navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const json = await fetchAdminAnalytics();
        setData(json);
      } catch (err) {
        setError(err.message || "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Admin Analytics" onBack={() => navigate("admin-dashboard")}>
        <Loader text="Loading analytics..." size={36} />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Analytics" onBack={() => navigate("admin-dashboard")}>
        <div style={{ color: "#ef4444", fontWeight: 600 }}>{error}</div>
      </DashboardLayout>
    );
  }

  const { status_distribution = [], monthly_data = [], purpose_distribution = [], total_stats = {} } = data || {};

  const statCards = [
    { label: "Total Applications", value: total_stats.total_loans, color: "#f97316", icon: "📋" },
    { label: "Total Disbursed", value: fmt(total_stats.total_amount), color: "#6366f1", icon: "💰" },
    { label: "Avg Loan Amount", value: fmt(total_stats.avg_amount), color: "#16a34a", icon: "📊" },
    { label: "Avg Tenure", value: `${Math.round(total_stats.avg_tenure)} mo`, color: "#06b6d4", icon: "📅" },
  ];

  const statusColors = {
    Pending: "#eab308",
    "Under Review": "#3b82f6",
    Approved: "#16a34a",
    Accepted: "#16a34a",
    Rejected: "#ef4444",
  };

  const statusPieData = status_distribution.map((s) => ({
    name: s.status,
    value: s.count,
    amount: s.total_amount,
  }));

  const purposePieData = purpose_distribution.map((p) => ({
    name: p.purpose,
    value: p.count,
    amount: p.total_amount,
  }));

  return (
    <DashboardLayout title="Loan Analytics Dashboard" onBack={() => navigate("admin-dashboard")}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "rgba(247,249,252,0.9)",
              borderRadius: 16,
              padding: "20px 22px",
              border: "1px solid rgba(203,213,225,0.55)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              transition: "transform 0.2s ease",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color, fontFamily: "'Montserrat', sans-serif", marginTop: 4 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Status + Purpose Pie Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, marginBottom: 32 }}>
        {/* Status Distribution */}
        <div style={{
          background: "rgba(247,249,252,0.9)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(203,213,225,0.55)",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}>
          <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 17, fontWeight: 800, color: "#c2410c", marginBottom: 4, marginTop: 0 }}>
            Status Distribution
          </h3>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>Breakdown by current loan status</p>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={statusColors[entry.name] || COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} loans (${fmt(props.payload.amount)})`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>No data available</div>
          )}
        </div>

        {/* Purpose Distribution */}
        <div style={{
          background: "rgba(247,249,252,0.9)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(203,213,225,0.55)",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}>
          <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 17, fontWeight: 800, color: "#312e81", marginBottom: 4, marginTop: 0 }}>
            Loan Purpose Breakdown
          </h3>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>Applications by loan type/purpose</p>
          {purposePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={purposePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {purposePieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} loans (${fmt(props.payload.amount)})`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>No data available</div>
          )}
        </div>
      </div>

      {/* Monthly Trends Bar Chart */}
      <div style={{
        background: "rgba(247,249,252,0.9)",
        borderRadius: 16,
        padding: 24,
        border: "1px solid rgba(203,213,225,0.55)",
        boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        marginBottom: 32,
      }}>
        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 17, fontWeight: 800, color: "#c2410c", marginBottom: 4, marginTop: 0 }}>
          Monthly Application Trends
        </h3>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 16 }}>Loan applications over the last 12 months</p>
        {monthly_data.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly_data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#64748b" }} label={{ value: "Count", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#64748b" } }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 12, fill: "#64748b" }} label={{ value: "Amount", angle: 90, position: "insideRight", style: { fontSize: 12, fill: "#64748b" } }} />
              <Tooltip
                formatter={(value, name) => [name === "total_amount" ? fmt(value) : value, name === "count" ? "Applications" : "Total Amount"]}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Legend formatter={(value) => (value === "count" ? "Applications" : "Total Amount")} />
              <Bar yAxisId="left" dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="total_amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>No monthly data available</div>
        )}
      </div>

      {/* Status Details Table */}
      <div style={{
        background: "rgba(247,249,252,0.9)",
        borderRadius: 16,
        padding: 24,
        border: "1px solid rgba(203,213,225,0.55)",
        boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
      }}>
        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 17, fontWeight: 800, color: "#c2410c", marginBottom: 16, marginTop: 0 }}>
          Status Details
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(249,115,22,0.12)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Count</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {status_distribution.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: statusColors[s.status] || "#94a3b8",
                      marginRight: 8,
                    }} />
                    {s.status}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>{s.count}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#6366f1" }}>{fmt(s.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
