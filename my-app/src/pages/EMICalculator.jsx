import { useState, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Section from "../components/ui/Section";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import ThemeToggle from "../components/ui/ThemeToggle";
import { LOAN_PURPOSES, TENURE_OPTIONS } from "../constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#6366f1", "#f97316", "#10b981", "#f43f5e"];

export default function EMICalculator({ navigate }) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [purpose, setPurpose] = useState("");

  const handlePurposeChange = (val) => {
    setPurpose(val);
    const found = LOAN_PURPOSES.find((p) => p.value === val);
    if (found) setRate(found.rate);
  };

  const result = useMemo(() => {
    const P = parseFloat(amount);
    const R = parseFloat(rate);
    const N = parseInt(tenure, 10);
    if (!P || !R || !N || P <= 0 || R <= 0 || N <= 0) return null;

    const monthlyRate = R / (12 * 100);
    const powerTerm = Math.pow(1 + monthlyRate, N);
    const emi = (P * monthlyRate * powerTerm) / (powerTerm - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    // Amortization schedule
    const schedule = [];
    let balance = P;
    for (let i = 1; i <= N; i++) {
      const interestPart = balance * monthlyRate;
      const principalPart = emi - interestPart;
      balance -= principalPart;
      schedule.push({
        month: i,
        principal: Math.round(principalPart),
        interest: Math.round(interestPart),
        balance: Math.max(0, Math.round(balance)),
      });
    }

    // Yearly summary for chart
    const yearlyData = [];
    for (let y = 0; y < Math.ceil(N / 12); y++) {
      const yearMonths = schedule.slice(y * 12, (y + 1) * 12);
      yearlyData.push({
        year: `Year ${y + 1}`,
        principal: yearMonths.reduce((s, m) => s + m.principal, 0),
        interest: yearMonths.reduce((s, m) => s + m.interest, 0),
      });
    }

    return {
      emi: Math.round(emi),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      principal: P,
      schedule,
      yearlyData,
      pieData: [
        { name: "Principal", value: Math.round(P) },
        { name: "Interest", value: Math.round(totalInterest) },
      ],
    };
  }, [amount, rate, tenure]);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 800, color: "#312e81", letterSpacing: "-0.3px" }}>
            EMI Calculator
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Calculate your monthly EMI, total interest, and view amortization breakdown
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={() => navigate("user-dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, alignItems: "start" }} className="responsive-grid-2col">
        {/* Input Section */}
        <Section title="Loan Parameters">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Loan Purpose</label>
              <select
                value={purpose}
                onChange={(e) => handlePurposeChange(e.target.value)}
                className="input-field"
                style={{ cursor: "pointer" }}
              >
                <option value="">Select purpose (auto-sets rate)</option>
                {LOAN_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value} ({p.rate}% p.a.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Loan Amount (Rs)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="e.g. 8.5"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Tenure (Months)</label>
              <select
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                className="input-field"
                style={{ cursor: "pointer" }}
              >
                <option value="">Select tenure</option>
                {TENURE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} months ({(t / 12).toFixed(1)} years)
                  </option>
                ))}
                <option value="60">60 months (5.0 years)</option>
                <option value="120">120 months (10.0 years)</option>
                <option value="180">180 months (15.0 years)</option>
                <option value="240">240 months (20.0 years)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Results Section */}
        <div>
          {result ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                <StatCard label="Monthly EMI" value={`Rs ${result.emi.toLocaleString()}`} accent="#6366f1" />
                <StatCard label="Total Interest" value={`Rs ${result.totalInterest.toLocaleString()}`} accent="#f97316" />
                <StatCard label="Total Payment" value={`Rs ${result.totalPayment.toLocaleString()}`} accent="#10b981" />
              </div>

              <Section title="Payment Breakdown">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }} className="responsive-grid-2col">
                  {/* Pie Chart */}
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {result.pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => `Rs ${val.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: "#6366f1" }} />
                      <span style={{ fontSize: 13, color: "#334155" }}>
                        Principal: <strong>Rs {Math.round(result.principal).toLocaleString()}</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: "#f97316" }} />
                      <span style={{ fontSize: 13, color: "#334155" }}>
                        Interest: <strong>Rs {result.totalInterest.toLocaleString()}</strong>
                      </span>
                    </div>
                    <div style={{ marginTop: 8, padding: "10px 14px", background: "#eef2ff", borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Interest to Principal Ratio</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#312e81" }}>
                        {result.principal > 0 ? ((result.totalInterest / result.principal) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Yearly Bar Chart */}
              {result.yearlyData.length > 1 && (
                <Section title="Yearly Principal vs Interest">
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.yearlyData}>
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(val) => `Rs ${val.toLocaleString()}`} />
                        <Bar dataKey="principal" fill="#6366f1" name="Principal" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="interest" fill="#f97316" name="Interest" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {/* Amortization Table */}
              <Section title="Amortization Schedule">
                <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#eef2ff", position: "sticky", top: 0 }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#312e81" }}>Month</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#312e81" }}>Principal</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#312e81" }}>Interest</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#312e81" }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.schedule.map((row) => (
                        <tr key={row.month} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px", color: "#475569" }}>{row.month}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#6366f1", fontWeight: 600 }}>Rs {row.principal.toLocaleString()}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#f97316", fontWeight: 600 }}>Rs {row.interest.toLocaleString()}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#334155", fontWeight: 600 }}>Rs {row.balance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          ) : (
            <Section title="Results">
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🧮</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Enter loan details to see EMI breakdown</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Select a loan purpose for auto-populated interest rate</div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
