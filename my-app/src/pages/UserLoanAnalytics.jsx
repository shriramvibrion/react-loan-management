import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan, enrichLoanAnalytics } from "../utils/loanUtils";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";

export default function UserLoanAnalytics() {
  const navigate = useNavigate();
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

  const accepted = loans.filter((l) => l.bucket === "Accepted");
  const totalAmount = accepted.reduce((s, l) => s + l.amount, 0);
  const totalPaid = accepted.reduce((s, l) => s + l.amountPaid, 0);
  const totalRemaining = accepted.reduce((s, l) => s + l.amountRemaining, 0);
  const overallPaidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 24, fontWeight: 900, color: "#1a5fc4" }}>
            Loan Analytics
          </div>
          <div style={{ fontSize: 14, color: "#5a6578", marginTop: 4 }}>
            Overview of your accepted loan progress
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate("/user/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {loading && <Loader text="Loading analytics..." />}
      {message && !loading && (
        <div style={{ padding: 12, background: "rgba(26,95,196,0.06)", borderRadius: 10, color: "#1a5fc4", fontWeight: 700 }}>{message}</div>
      )}

      {!loading && !message && accepted.length === 0 && (
        <EmptyState icon="📊" title="No accepted loans" description="Once loans are accepted, analytics will appear here." />
      )}

      {!loading && !message && accepted.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Accepted Loans", value: accepted.length, accent: "#1a5fc4" },
              { label: "Total Borrowed", value: `Rs ${totalAmount.toLocaleString()}`, accent: "#1a5fc4" },
              { label: "Total Paid", value: `Rs ${Math.round(totalPaid).toLocaleString()}`, accent: "#16a34a" },
              { label: "Remaining", value: `Rs ${Math.round(totalRemaining).toLocaleString()}`, accent: "#dc2626" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.96)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: 12, color: "#5a6578", fontWeight: 800 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.accent, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a5fc4", marginBottom: 10 }}>Overall Repayment Progress</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 14, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ width: `${overallPaidPercent}%`, height: "100%", background: "#16a34a", transition: "width 0.5s" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>{overallPaidPercent}%</span>
            </div>
            <div style={{ fontSize: 13, color: "#5a6578" }}>
              Paid Rs {Math.round(totalPaid).toLocaleString()} of Rs {totalAmount.toLocaleString()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {accepted.map((loan) => (
              <div
                key={loan.loan_id}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 16,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a5fc4" }}>Loan #{loan.loan_id}</div>
                    <div style={{ fontSize: 12, color: "#5a6578" }}>
                      Applied: {loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 8, background: "#f1f5f9", fontWeight: 700 }}>
                      Rs {loan.amount.toLocaleString()}
                    </span>
                    <span style={{ padding: "4px 10px", borderRadius: 8, background: "#f1f5f9", fontWeight: 700 }}>
                      {loan.tenure} months
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Amount Progress</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                        <div style={{ width: `${loan.paidPercent}%`, height: "100%", background: "#16a34a" }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{loan.paidPercent}%</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5a6578" }}>
                      Paid: Rs {Math.round(loan.amountPaid).toLocaleString()} | Remaining: Rs {Math.round(loan.amountRemaining).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Tenure Progress</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                        <div style={{ width: `${loan.monthCompletedPercent}%`, height: "100%", background: "#2563eb" }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{loan.monthCompletedPercent}%</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5a6578" }}>
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
