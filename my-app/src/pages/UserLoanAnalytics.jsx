import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan, enrichLoanAnalytics } from "../utils/loanUtils";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import ProgressBar from "../components/ui/ProgressBar";
import Section from "../components/ui/Section";

export default function UserLoanAnalytics({ navigate }) {
  const { userEmail } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userEmail) return;
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchUserLoans(userEmail);
        const normalized = items.map(normalizeLoan);
        setLoans(normalized.map(enrichLoanAnalytics));
      } catch (err) {
        setMessage(err.message || "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userEmail]);

  const accepted = useMemo(() => loans.filter((l) => l.bucket === "Accepted"), [loans]);
  const totalAmount = useMemo(() => accepted.reduce((s, l) => s + l.amount, 0), [accepted]);
  const totalPaid = useMemo(() => accepted.reduce((s, l) => s + l.amountPaid, 0), [accepted]);
  const totalRemaining = useMemo(() => accepted.reduce((s, l) => s + l.amountRemaining, 0), [accepted]);
  const overallPaidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 800, color: "#312e81", letterSpacing: "-0.3px" }}>
            Loan Analytics
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Overview of your accepted loan progress
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate("user-dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {loading && <Loader text="Loading analytics..." />}
      {message && !loading && (
        <div style={{ padding: 12, background: "rgba(99,102,241,0.06)", borderRadius: 10, color: "#4338ca", fontWeight: 600 }}>{message}</div>
      )}

      {!loading && !message && accepted.length === 0 && (
        <EmptyState icon="📊" title="No accepted loans" description="Once loans are accepted, analytics will appear here." />
      )}

      {!loading && !message && accepted.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <StatCard label="Accepted Loans" value={accepted.length} />
            <StatCard label="Total Borrowed" value={`Rs ${totalAmount.toLocaleString()}`} />
            <StatCard label="Total Paid" value={`Rs ${Math.round(totalPaid).toLocaleString()}`} accent="#16a34a" />
            <StatCard label="Remaining" value={`Rs ${Math.round(totalRemaining).toLocaleString()}`} accent="#dc2626" />
          </div>

          <Section title="Overall Repayment Progress">
            <ProgressBar percent={overallPaidPercent} color="#16a34a" height={14} />
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
              Paid Rs {Math.round(totalPaid).toLocaleString()} of Rs {totalAmount.toLocaleString()}
            </div>
          </Section>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {accepted.map((loan) => (
              <div
                key={loan.loan_id}
                style={{
                  background: "rgba(247,249,252,0.92)",
                  borderRadius: 16,
                  padding: 18,
                  border: "1px solid rgba(203,213,225,0.55)",
                  boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
                  transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#312e81", fontFamily: "'Montserrat', sans-serif" }}>Loan #{loan.loan_id}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Applied: {loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 8, background: "#eef2ff", fontWeight: 600, color: "#312e81" }}>
                      Rs {loan.amount.toLocaleString()}
                    </span>
                    <span style={{ padding: "4px 10px", borderRadius: 8, background: "#eef2ff", fontWeight: 600, color: "#312e81" }}>
                      {loan.tenure} months
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <ProgressBar percent={loan.paidPercent} color="#16a34a" height={10} label="Amount Progress" />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Paid: Rs {Math.round(loan.amountPaid).toLocaleString()} | Remaining: Rs {Math.round(loan.amountRemaining).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <ProgressBar percent={loan.monthCompletedPercent} color="#6366f1" height={10} label="Tenure Progress" />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {loan.monthsCompleted} of {loan.tenure} months completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
