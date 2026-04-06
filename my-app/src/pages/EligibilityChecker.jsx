import { useState, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Section from "../components/ui/Section";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import ProgressBar from "../components/ui/ProgressBar";
import ThemeToggle from "../components/ui/ThemeToggle";
import { LOAN_PURPOSES, EMPLOYMENT_TYPES } from "../constants";

const AGE_MIN = 21;
const AGE_MAX = 60;
const MIN_INCOME = 15000;
const MAX_EMI_TO_INCOME_RATIO = 0.5;
const MAX_DEBT_TO_INCOME = 0.6;

export default function EligibilityChecker({ navigate }) {
  const [form, setForm] = useState({
    age: "",
    monthlyIncome: "",
    employment: "",
    existingEMI: "",
    loanPurpose: "",
    tenure: "36",
    creditScore: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const result = useMemo(() => {
    const age = parseInt(form.age, 10);
    const income = parseFloat(form.monthlyIncome);
    const existingEMI = parseFloat(form.existingEMI) || 0;
    const tenure = parseInt(form.tenure, 10);
    const creditScore = parseInt(form.creditScore, 10) || 700;

    if (!age || !income || !form.employment || !form.loanPurpose || !tenure) return null;

    const issues = [];
    let eligible = true;
    let score = 100;

    // Age check
    if (age < AGE_MIN) {
      issues.push({ text: `Minimum age is ${AGE_MIN} years`, type: "error" });
      eligible = false;
      score -= 30;
    } else if (age > AGE_MAX) {
      issues.push({ text: `Maximum age for loan is ${AGE_MAX} years`, type: "error" });
      eligible = false;
      score -= 30;
    } else if (age > 55) {
      issues.push({ text: "Age above 55 may limit tenure options", type: "warning" });
      score -= 10;
    }

    // Income check
    if (income < MIN_INCOME) {
      issues.push({ text: `Minimum monthly income required is Rs ${MIN_INCOME.toLocaleString()}`, type: "error" });
      eligible = false;
      score -= 25;
    }

    // Debt-to-income check
    const dtiRatio = income > 0 ? existingEMI / income : 0;
    if (dtiRatio > MAX_DEBT_TO_INCOME) {
      issues.push({ text: "Existing debt exceeds 60% of income", type: "error" });
      eligible = false;
      score -= 20;
    } else if (dtiRatio > 0.4) {
      issues.push({ text: "Existing debt is high (above 40% of income)", type: "warning" });
      score -= 10;
    }

    // Credit score
    if (creditScore < 600) {
      issues.push({ text: "Credit score below 600 — very low eligibility", type: "error" });
      eligible = false;
      score -= 25;
    } else if (creditScore < 700) {
      issues.push({ text: "Credit score below 700 — may get higher interest rates", type: "warning" });
      score -= 10;
    } else if (creditScore >= 750) {
      issues.push({ text: "Excellent credit score — you may qualify for lower rates", type: "success" });
      score += 5;
    }

    // Employment type factor
    let employmentMultiplier = 1;
    if (form.employment === "Salaried") {
      employmentMultiplier = 1;
    } else if (form.employment === "Self-Employed") {
      employmentMultiplier = 0.85;
      issues.push({ text: "Self-employed borrowers may need additional income proof", type: "info" });
    } else if (form.employment === "Student") {
      employmentMultiplier = 0.5;
      issues.push({ text: "Students need a co-applicant or guarantor", type: "warning" });
      score -= 10;
    } else if (form.employment === "Retired") {
      employmentMultiplier = 0.7;
      issues.push({ text: "Retired applicants may have limited tenure", type: "warning" });
      score -= 5;
    }

    // Calculate max eligible amount
    const availableForEMI = Math.max(0, income * MAX_EMI_TO_INCOME_RATIO - existingEMI);
    const purposeObj = LOAN_PURPOSES.find((p) => p.value === form.loanPurpose);
    const annualRate = purposeObj ? parseFloat(purposeObj.rate) : 10;
    const monthlyRate = annualRate / (12 * 100);

    let maxLoanAmount = 0;
    if (monthlyRate > 0 && tenure > 0 && availableForEMI > 0) {
      const powerTerm = Math.pow(1 + monthlyRate, tenure);
      maxLoanAmount = availableForEMI * (powerTerm - 1) / (monthlyRate * powerTerm);
      maxLoanAmount *= employmentMultiplier;
    }

    maxLoanAmount = Math.max(0, Math.round(maxLoanAmount));

    if (eligible && maxLoanAmount < 50000) {
      issues.push({ text: "Eligible loan amount is very low based on income", type: "warning" });
    }

    if (eligible && issues.filter(i => i.type === "error").length === 0) {
      issues.unshift({ text: "You appear eligible for a loan!", type: "success" });
    }

    const maxEMI = Math.round(availableForEMI);

    score = Math.max(0, Math.min(100, score));

    return {
      eligible,
      maxLoanAmount,
      maxEMI,
      annualRate,
      dtiRatio: Math.round(dtiRatio * 100),
      score,
      issues,
    };
  }, [form]);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 800, color: "#312e81", letterSpacing: "-0.3px" }}>
            Loan Eligibility Checker
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Check your loan eligibility and maximum borrowing capacity
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
        {/* Input Form */}
        <Section title="Your Details">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Age</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 30"
                value={form.age}
                onChange={(e) => handleChange("age", e.target.value)}
                min="18"
                max="70"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Monthly Income (Rs)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 50000"
                value={form.monthlyIncome}
                onChange={(e) => handleChange("monthlyIncome", e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Employment Type</label>
              <select
                className="input-field"
                value={form.employment}
                onChange={(e) => handleChange("employment", e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="">Select employment type</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Existing Monthly EMIs (Rs)</label>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                value={form.existingEMI}
                onChange={(e) => handleChange("existingEMI", e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Credit Score</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 750"
                value={form.creditScore}
                onChange={(e) => handleChange("creditScore", e.target.value)}
                min="300"
                max="900"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Loan Purpose</label>
              <select
                className="input-field"
                value={form.loanPurpose}
                onChange={(e) => handleChange("loanPurpose", e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="">Select purpose</option>
                {LOAN_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value} ({p.rate}% p.a.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>Desired Tenure (Months)</label>
              <select
                className="input-field"
                value={form.tenure}
                onChange={(e) => handleChange("tenure", e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
                <option value="48">48 months</option>
                <option value="60">60 months</option>
                <option value="120">120 months</option>
                <option value="180">180 months</option>
                <option value="240">240 months</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Results */}
        <div>
          {result ? (
            <>
              {/* Eligibility Score */}
              <div style={{
                background: result.eligible
                  ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                  : "linear-gradient(135deg, #fff1f2, #ffe4e6)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                border: `1px solid ${result.eligible ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 36 }}>{result.eligible ? "✅" : "❌"}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: result.eligible ? "#065f46" : "#9f1239" }}>
                      {result.eligible ? "Eligible for Loan" : "Not Eligible"}
                    </div>
                    <div style={{ fontSize: 13, color: result.eligible ? "#047857" : "#be123c" }}>
                      Eligibility Score: {result.score}/100
                    </div>
                  </div>
                </div>
                <ProgressBar
                  percent={result.score}
                  color={result.score >= 70 ? "#10b981" : result.score >= 40 ? "#f59e0b" : "#ef4444"}
                  height={10}
                />
              </div>

              {/* Key Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
                <StatCard label="Max Loan Amount" value={`Rs ${result.maxLoanAmount.toLocaleString()}`} accent="#6366f1" />
                <StatCard label="Max Monthly EMI" value={`Rs ${result.maxEMI.toLocaleString()}`} accent="#10b981" />
                <StatCard label="Interest Rate" value={`${result.annualRate}% p.a.`} accent="#f97316" />
                <StatCard label="Debt-to-Income" value={`${result.dtiRatio}%`} accent={result.dtiRatio > 40 ? "#ef4444" : "#10b981"} />
              </div>

              {/* Issues & Recommendations */}
              <Section title="Assessment Details">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.issues.map((issue, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background:
                          issue.type === "error" ? "rgba(239,68,68,0.06)" :
                          issue.type === "warning" ? "rgba(245,158,11,0.06)" :
                          issue.type === "success" ? "rgba(16,185,129,0.06)" :
                          "rgba(99,102,241,0.06)",
                        border: `1px solid ${
                          issue.type === "error" ? "rgba(239,68,68,0.15)" :
                          issue.type === "warning" ? "rgba(245,158,11,0.15)" :
                          issue.type === "success" ? "rgba(16,185,129,0.15)" :
                          "rgba(99,102,241,0.15)"
                        }`,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>
                        {issue.type === "error" && "❌"}
                        {issue.type === "warning" && "⚠️"}
                        {issue.type === "success" && "✅"}
                        {issue.type === "info" && "ℹ️"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{issue.text}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {result.eligible && (
                <div style={{ marginTop: 12 }}>
                  <Button variant="primary" onClick={() => navigate("apply-loan")}>
                    Apply for Loan Now
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Section title="Eligibility Result">
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Fill in your details to check eligibility</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>We'll calculate your maximum borrowing capacity</div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
