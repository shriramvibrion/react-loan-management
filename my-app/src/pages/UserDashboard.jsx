import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan, getStatusStyle } from "../utils/loanUtils";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    if (!userEmail) return;
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchUserLoans(userEmail);
        setLoans(items.map(normalizeLoan));
      } catch (err) {
        setMessage(err.message || "Failed to load loans.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userEmail]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const bucketCounts = useMemo(
    () =>
      loans.reduce(
        (acc, l) => {
          acc[l.bucket] = (acc[l.bucket] || 0) + 1;
          return acc;
        },
        { Draft: 0, Pending: 0, Accepted: 0, Rejected: 0 }
      ),
    [loans]
  );

  const tabs = [
    { key: "all", label: "All" },
    { key: "Draft", label: "Draft" },
    { key: "Pending", label: "Pending" },
    { key: "Accepted", label: "Accepted" },
    { key: "Rejected", label: "Rejected" },
  ];

  const filteredLoans = useMemo(
    () => (tab === "all" ? loans : loans.filter((l) => l.bucket === tab)),
    [loans, tab]
  );

  const displayIdMap = useMemo(() => {
    const loansByCreationOrder = [...loans].sort((a, b) => {
      const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      return (a.loan_id || 0) - (b.loan_id || 0);
    });
    return new Map(loansByCreationOrder.map((loan, idx) => [loan.loan_id, idx + 1]));
  }, [loans]);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 800, color: "#4f46e5", letterSpacing: "-0.3px" }}>
            My Loan Applications
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>
            Track your loans and their status
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button variant="primary" size="sm" onClick={() => navigate("/user/apply")}>
            + Apply New
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/user/analytics")}>
            Analytics
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: loans.length, accent: "#6366f1" },
          { label: "Draft", value: bucketCounts.Draft, accent: "#64748b" },
          { label: "Pending", value: bucketCounts.Pending, accent: "#f59e0b" },
          { label: "Accepted", value: bucketCounts.Accepted, accent: "#10b981" },
          { label: "Rejected", value: bucketCounts.Rejected, accent: "#f43f5e" },
        ].map((s) => (
          <Card key={s.label} style={{ borderLeft: `3px solid ${s.accent}`, background: "linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.97))" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.accent, marginTop: 6, fontFamily: "'Montserrat', sans-serif" }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "1.5px solid",
              borderColor: tab === t.key ? "#6366f1" : "#e2e8f0",
              background: tab === t.key ? "linear-gradient(135deg, #eef2ff, #e0e7ff)" : "rgba(255,255,255,0.8)",
              color: tab === t.key ? "#4f46e5" : "#64748b",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loader text="Loading your loans..." />}
      {message && !loading && (
        <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", border: "1px solid #c7d2fe", color: "#4338ca", fontWeight: 600 }}>
          {message}
        </Card>
      )}
      {!loading && !message && loans.length === 0 && (
        <EmptyState
          icon="📋"
          title="No loan applications yet"
          description="Start your first loan application to track it here."
          action={
            <Button variant="primary" onClick={() => navigate("/user/apply")}>
              Apply for a Loan
            </Button>
          }
        />
      )}
      {!loading && !message && filteredLoans.length === 0 && loans.length > 0 && (
        <div style={{ marginTop: 30, textAlign: "center", color: "#64748b", fontWeight: 500 }}>
          No loans in the "{tab}" category.
        </div>
      )}

      {!loading && !message && filteredLoans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filteredLoans.map((loan) => {
            const st = getStatusStyle(loan.status);
            const tone = st.bg === "#d4edda" ? "success" : st.bg === "#f8d7da" ? "danger" : "warning";
            const isExpanded = expandedCard === loan.loan_id;

            return (
              <Card
                key={loan.loan_id}
                style={{
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  borderTop: "2px solid transparent",
                  borderImage: tone === "success" ? "linear-gradient(135deg, #10b981, #059669) 1" : tone === "danger" ? "linear-gradient(135deg, #f43f5e, #e11d48) 1" : "linear-gradient(135deg, #f59e0b, #d97706) 1",
                }}
                onClick={() => setExpandedCard(isExpanded ? null : loan.loan_id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 28px rgba(15,23,42,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.06)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#4f46e5", fontFamily: "'Montserrat', sans-serif" }}>
                    Loan #{displayIdMap.get(loan.loan_id)}
                  </span>
                  <Badge tone={tone}>{loan.status}</Badge>
                </div>

                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#64748b" }}>Amount:</span> <strong>Rs {Number(loan.loan_amount).toLocaleString()}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Tenure:</span> <strong>{loan.tenure} months</strong></div>
                  {isExpanded && (
                    <div style={{ animation: "slideUp 0.2s ease" }}>
                      <div><span style={{ color: "#64748b" }}>Interest:</span> <strong>{loan.interest_rate}%</strong></div>
                      <div><span style={{ color: "#64748b" }}>EMI:</span> <strong>Rs {Number(loan.emi).toFixed(2)}</strong></div>
                      <div><span style={{ color: "#64748b" }}>Applied:</span> <strong>{loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}</strong></div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  {loan.status === "Draft" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/apply?draft=${loan.loan_id}`);
                      }}
                    >
                      Continue Application
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/loan/${loan.loan_id}`, { state: { displayId: displayIdMap.get(loan.loan_id) } });
                      }}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          {loans.length} total loan(s) for {userEmail}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/documentation")}>
          Documentation
        </Button>
      </div>
    </DashboardLayout>
  );
}
