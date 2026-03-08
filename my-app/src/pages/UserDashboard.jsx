import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { getStatusStyle } from "../utils/loanUtils";
import { useDashboardData } from "../hooks/useDashboardData";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { userEmail, logout } = useAuth();
  
  const { loans, loading, message, bucketCounts, displayIdMap } = useDashboardData(userEmail);

  const [tab, setTab] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "Draft", label: "Draft" },
    { key: "Pending", label: "Pending" },
    { key: "Accepted", label: "Accepted" },
    { key: "Rejected", label: "Rejected" },
  ];

  const filteredLoans = tab === "all" ? loans : loans.filter((l) => l.bucket === tab);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 24, fontWeight: 900, color: "#1a5fc4" }}>
            My Loan Applications
          </div>
          <div style={{ fontSize: 14, color: "#5a6578", marginTop: 4 }}>
            Track your loans and their status
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total", value: loans.length, accent: "#1a5fc4" },
          { label: "Draft", value: bucketCounts.Draft, accent: "#6b7280" },
          { label: "Pending", value: bucketCounts.Pending, accent: "#d97706" },
          { label: "Accepted", value: bucketCounts.Accepted, accent: "#16a34a" },
          { label: "Rejected", value: bucketCounts.Rejected, accent: "#dc2626" },
        ].map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 12, color: "#5a6578", fontWeight: 800 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.accent, marginTop: 4 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "2px solid",
              borderColor: tab === t.key ? "#1a5fc4" : "transparent",
              background: tab === t.key ? "rgba(26,95,196,0.08)" : "rgba(255,255,255,0.7)",
              color: tab === t.key ? "#1a5fc4" : "#5a6578",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loader text="Loading your loans..." />}
      {message && !loading && (
        <Card style={{ marginBottom: 16, background: "rgba(26,95,196,0.06)", border: "1px solid rgba(26,95,196,0.35)", color: "#1a5fc4", fontWeight: 700 }}>
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
        <div style={{ marginTop: 30, textAlign: "center", color: "#5a6578" }}>
          No loans in the "{tab}" category.
        </div>
      )}

      {!loading && !message && filteredLoans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filteredLoans.map((loan) => {
            const st = getStatusStyle(loan.status);
            const tone = st.bg === "#d4edda" ? "success" : st.bg === "#f8d7da" ? "danger" : "warning";
            const isExpanded = expandedCard === loan.loan_id;

            return (
              <Card
                key={loan.loan_id}
                style={{ cursor: "pointer", transition: "transform 0.2s" }}
                onClick={() => setExpandedCard(isExpanded ? null : loan.loan_id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#1a5fc4" }}>
                    Loan #{displayIdMap.get(loan.loan_id)}
                  </span>
                  <Badge tone={tone}>{loan.status}</Badge>
                </div>

                <div style={{ fontSize: 13, color: "#2d3748", lineHeight: 1.7 }}>
                  <div><strong>Amount:</strong> Rs {Number(loan.loan_amount).toLocaleString()}</div>
                  <div><strong>Tenure:</strong> {loan.tenure} months</div>
                  {isExpanded && (
                    <>
                      <div><strong>Interest:</strong> {loan.interest_rate}%</div>
                      <div><strong>EMI:</strong> Rs {Number(loan.emi).toFixed(2)}</div>
                      <div><strong>Applied:</strong> {loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}</div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/loan/${loan.loan_id}`);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 18, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#5a6578" }}>
          {loans.length} total loan(s) for {userEmail}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/documentation")}>
          Documentation
        </Button>
      </div>
    </DashboardLayout>
  );
}
