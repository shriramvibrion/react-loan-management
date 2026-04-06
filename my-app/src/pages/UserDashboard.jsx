import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan, getStatusStyle } from "../utils/loanUtils";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import NotificationBell from "../components/ui/NotificationBell";

const PAGE_LIMIT = 6;

const TAB_TO_STATUS = {
  all: "all",
  Draft: "draft",
  Pending: "pending",
  Rework: "rework",
  Accepted: "accepted",
  Rejected: "rejected",
};

const DASHBOARD_THEME = {
  title: "#4f46e5",
  panelGlass: "rgba(247,249,252,0.9)",
  panelBorder: "rgba(203,213,225,0.55)",
  softText: "#64748b",
};

export default function UserDashboard({ navigate }) {
  const { userEmail, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState({ total: 0, draft: 0, pending: 0, rework: 0, accepted: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total_items: 0, total_pages: 1, has_prev: false, has_next: false });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("all");
  const [activeLoanId, setActiveLoanId] = useState(null);
  const [page, setPage] = useState(1);

  const go = useCallback(
    (target, params = {}) => {
      if (typeof navigate === "function") {
        if (params && Object.keys(params).length > 0) {
          navigate(target, params);
        } else {
          navigate(target);
        }
        return;
      }

      // In this app shell, page transitions are handled via the `navigate` prop.
    },
    [navigate]
  );

  useEffect(() => {
    setPage(1);
    setActiveLoanId(null);
  }, [tab]);

  useEffect(() => {
    if (!userEmail) return;

    const load = async () => {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetchUserLoans(userEmail, {
          page,
          limit: PAGE_LIMIT,
          status: TAB_TO_STATUS[tab] || "all",
          rawResponse: true,
        });

        const seen = new Set();
        const normalized = (response.loans || [])
          .map((item, index) => {
            const loan = normalizeLoan(item);
            const resolvedId = loan.loan_id ?? loan.id ?? null;
            return {
              ...loan,
              loan_id: resolvedId,
              _clientKey: resolvedId != null ? `loan-${resolvedId}` : `loan-fallback-${page}-${index}`,
            };
          })
          .filter((loan) => {
            if (loan.loan_id == null) return true;
            if (seen.has(loan.loan_id)) return false;
            seen.add(loan.loan_id);
            return true;
          });

        setLoans(normalized);
        setPagination(
          response.pagination || {
            page,
            limit: PAGE_LIMIT,
            total_items: normalized.length,
            total_pages: 1,
            has_prev: false,
            has_next: false,
          }
        );
        setSummary(response.summary || { total: 0, draft: 0, pending: 0, rework: 0, accepted: 0, rejected: 0 });

      } catch (err) {
        setLoans([]);
        setMessage(err.message || "Failed to load loans.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userEmail, tab, page]);

  useEffect(() => {
    if (activeLoanId == null) return;
    const isVisible = loans.some((loan) => (loan.loan_id ?? loan._clientKey) === activeLoanId);
    if (!isVisible) {
      setActiveLoanId(null);
    }
  }, [loans, activeLoanId]);

  const handleLogout = useCallback(() => {
    logout();
    go("index");
  }, [logout, go]);

  const bucketCounts = useMemo(
    () => ({
      Draft: summary.draft || 0,
      Pending: summary.pending || 0,
      Rework: summary.rework || 0,
      Accepted: summary.accepted || 0,
      Rejected: summary.rejected || 0,
      Total: summary.total || 0,
    }),
    [summary]
  );

  const cibilInfo = useMemo(() => {
    const accepted = bucketCounts.Accepted;
    const rejected = bucketCounts.Rejected;
    const pendingPressure = bucketCounts.Pending + bucketCounts.Rework;
    let score = 650 + accepted * 50 - rejected * 80 + pendingPressure * 5;
    score = Math.max(300, Math.min(900, score));
    let rating = "Poor";
    let ratingBg = "#fee2e2";
    let ratingColor = "#b91c1c";
    if (score >= 750) {
      rating = "Excellent";
      ratingBg = "#dcfce7";
      ratingColor = "#166534";
    } else if (score >= 670) {
      rating = "Good";
      ratingBg = "#dcfce7";
      ratingColor = "#166534";
    } else if (score >= 580) {
      rating = "Fair";
      ratingBg = "#fef3c7";
      ratingColor = "#92400e";
    }
    return {
      score,
      rating,
      ratingBg,
      ratingColor,
      eligible: score >= 650,
      toneBorder: "rgba(148,163,184,0.26)",
    };
  }, [bucketCounts]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "Draft", label: "Draft" },
    { key: "Pending", label: "Pending" },
    { key: "Rework", label: "Rework" },
    { key: "Accepted", label: "Accepted" },
    { key: "Rejected", label: "Rejected" },
  ];

  const filteredLoans = useMemo(() => {
    if (tab === "all") return loans;

    const expectedStatus = TAB_TO_STATUS[tab] || "all";
    if (expectedStatus === "all") return loans;

    return loans.filter((loan) => {
      const status = String(loan.status || "").trim().toLowerCase();
      if (expectedStatus === "accepted") {
        return status === "accepted" || status === "approved";
      }
      return status === expectedStatus;
    });
  }, [loans, tab]);

  const goToPage = useCallback((nextPage) => {
    const totalPages = pagination.total_pages || 1;
    const bounded = Math.max(1, Math.min(totalPages, nextPage));
    setPage(bounded);
    setActiveLoanId(null);
  }, [pagination.total_pages]);

  const getLoanDisplayId = useCallback((loan) => {
    if (loan.loan_id == null) return "N/A";
    return String(loan.loan_id);
  }, []);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 800, color: DASHBOARD_THEME.title, letterSpacing: "-0.3px" }}>
              <i>My Loan Applications</i>
          </div>
          <div style={{ fontSize: 13, color: DASHBOARD_THEME.softText, marginTop: 4, fontWeight: 500 }}>
            Track your loans and their status
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <NotificationBell email={userEmail} role="user" navigate={navigate} />
          <Button variant="primary" size="sm" onClick={() => go("apply-loan")}>
            + Apply New
          </Button>
          <Button variant="secondary" size="sm" onClick={() => go("user-loan-analytics")}>
            Analytics
          </Button>
          <Button variant="secondary" size="sm" onClick={() => go("documentation")}>
            Documentation
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* CIBIL Score Widget */}
      {cibilInfo && summary.total > 0 && (
        <Card
          style={{
            marginBottom: 20,
            background: "rgba(247,249,252,0.95)",
            border: `1px solid ${cibilInfo.toneBorder}`,
            boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.9px" }}>
                CIBIL SCORE (CALCULATED)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 44, lineHeight: 1, fontWeight: 900, color: "#2563eb", fontFamily: "'Montserrat', sans-serif" }}>
                  {cibilInfo.score}
                </span>
                <span style={{ fontSize: 24, lineHeight: 1, color: "#2563eb", fontWeight: 700 }}>/ 900</span>
                <span
                  style={{
                    marginLeft: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: cibilInfo.ratingBg,
                    color: cibilInfo.ratingColor,
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.3,
                  }}
                >
                  {cibilInfo.rating}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {[

              ].map((item) => (
                <div key={item.label} style={{ minWidth: 52, textAlign: "center" }}>
                  <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 800, color: item.color, fontFamily: "'Montserrat', sans-serif" }}>{item.value}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: "#64748b", fontWeight: 600 }}>{item.label}</div>
                </div>
              ))}

              <div
                style={{
                  padding: "7px 11px",
                  borderRadius: 12,
                  border: "1px solid #86efac",
                  background: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 110,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{cibilInfo.eligible ? "✓" : "!"}</span>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{cibilInfo.eligible ? "Eligible" : "Review"}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.9 }}>{cibilInfo.eligible ? "for new loan" : "score is low"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: bucketCounts.Total, accent: "#6366f1" },
          { label: "Draft", value: bucketCounts.Draft, accent: "#64748b" },
          { label: "Pending", value: bucketCounts.Pending, accent: "#f59e0b" },
          { label: "Rework", value: bucketCounts.Rework, accent: "#2563eb" },
          { label: "Accepted", value: bucketCounts.Accepted, accent: "#10b981" },
          { label: "Rejected", value: bucketCounts.Rejected, accent: "#f43f5e" },
        ].map((s) => (
          <Card key={s.label} style={{ border: `1px solid ${DASHBOARD_THEME.panelBorder}`, background: DASHBOARD_THEME.panelGlass, boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
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
              background: tab === t.key ? "rgba(224,231,255,0.85)" : "rgba(248,250,252,0.92)",
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
      {!loading && !message && summary.total === 0 && (
        <EmptyState
          icon="📋"
          title="No loan applications yet"
          description="Start your first loan application to track it here."
          action={
            <Button variant="primary" onClick={() => go("apply-loan")}>
              Apply for a Loan
            </Button>
          }
        />
      )}
      {!loading && !message && filteredLoans.length === 0 && summary.total > 0 && (
        <div style={{ marginTop: 30, textAlign: "center", color: "#64748b", fontWeight: 500 }}>
          No loans in the "{tab}" category.
        </div>
      )}

      {!loading && !message && filteredLoans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filteredLoans.map((loan) => {
            const statusLower = (loan.status || "").toLowerCase();
            const tone =
              statusLower === "approved" || statusLower === "accepted"
                ? "success"
                : statusLower === "rejected"
                ? "danger"
                : statusLower === "under review" || statusLower === "rework"
                ? "info"
                : "warning";
            const toneBorder =
              tone === "success" ? "#10b981" : tone === "danger" ? "#f43f5e" : tone === "info" ? "#2563eb" : "#f59e0b";
            const cardId = loan.loan_id ?? loan._clientKey;
            const isExpanded = activeLoanId != null && activeLoanId === cardId;

            return (
              <Card
                key={loan._clientKey}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1), background 0.22s ease",
                  borderRadius: 24,
                  border: `1.5px solid ${toneBorder}`,
                  background: DASHBOARD_THEME.panelGlass,
                  boxShadow: "0 3px 10px rgba(15,23,42,0.06)",
                  willChange: "transform, box-shadow",
                }}
                onClick={() => setActiveLoanId(isExpanded ? null : cardId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 28px rgba(15,23,42,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(15,23,42,0.06)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px) scale(0.996)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#4f46e5", fontFamily: "'Montserrat', sans-serif" }}>
                    Loan #{getLoanDisplayId(loan)}
                  </span>
                  <Badge tone={tone}>{loan.status}</Badge>
                </div>

                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#64748b" }}>Amount:</span> <strong>Rs {Number(loan.loan_amount).toLocaleString()}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Tenure:</span> <strong>{loan.tenure} months</strong></div>
                  <div
                    style={{
                      maxHeight: isExpanded ? 190 : 0,
                      opacity: isExpanded ? 1 : 0,
                      transform: isExpanded ? "translateY(0)" : "translateY(-6px)",
                      overflow: "hidden",
                      transition: "max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, transform 0.3s ease",
                    }}
                  >
                    <div style={{ paddingTop: isExpanded ? 4 : 0, transition: "padding-top 0.28s ease" }}>
                      <div><span style={{ color: "#64748b" }}>Interest:</span> <strong>{loan.interest_rate}%</strong></div>
                      <div><span style={{ color: "#64748b" }}>EMI:</span> <strong>Rs {Number(loan.emi).toFixed(2)}</strong></div>
                      <div><span style={{ color: "#64748b" }}>Applied:</span> <strong>{loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}</strong></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  {loan.status === "Draft" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        go("apply-loan", { draftLoanId: loan.loan_id });
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
                        go("user-loan-detail", { userLoanId: loan.loan_id });
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

      {!loading && !message && summary.total > 0 && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={!pagination.has_prev}
            style={{
              minWidth: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${DASHBOARD_THEME.panelBorder}`,
              background: pagination.has_prev ? "rgba(238,243,252,0.86)" : "rgba(241,245,249,0.8)",
              color: pagination.has_prev ? "#334155" : "#94a3b8",
              fontWeight: 700,
              cursor: pagination.has_prev ? "pointer" : "not-allowed",
            }}
          >
            {"<<"}
          </button>
          <button
            type="button"
            onClick={() => goToPage((pagination.page || 1) - 1)}
            disabled={!pagination.has_prev}
            style={{
              minWidth: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${DASHBOARD_THEME.panelBorder}`,
              background: pagination.has_prev ? "rgba(238,243,252,0.86)" : "rgba(241,245,249,0.8)",
              color: pagination.has_prev ? "#334155" : "#94a3b8",
              fontWeight: 700,
              cursor: pagination.has_prev ? "pointer" : "not-allowed",
            }}
          >
            {"<"}
          </button>

          <div style={{ minWidth: 120, textAlign: "center", fontSize: 13, color: "#475569", fontWeight: 700 }}>
            {pagination.page || 1} / {pagination.total_pages || 1}
          </div>

          <button
            type="button"
            onClick={() => goToPage((pagination.page || 1) + 1)}
            disabled={!pagination.has_next}
            style={{
              minWidth: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${DASHBOARD_THEME.panelBorder}`,
              background: pagination.has_next ? "rgba(238,243,252,0.86)" : "rgba(241,245,249,0.8)",
              color: pagination.has_next ? "#334155" : "#94a3b8",
              fontWeight: 700,
              cursor: pagination.has_next ? "pointer" : "not-allowed",
            }}
          >
            {">"}
          </button>
          <button
            type="button"
            onClick={() => goToPage(pagination.total_pages || 1)}
            disabled={!pagination.has_next}
            style={{
              minWidth: 40,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${DASHBOARD_THEME.panelBorder}`,
              background: pagination.has_next ? "rgba(238,243,252,0.86)" : "rgba(241,245,249,0.8)",
              color: pagination.has_next ? "#334155" : "#94a3b8",
              fontWeight: 700,
              cursor: pagination.has_next ? "pointer" : "not-allowed",
            }}
          >
            {"> >"}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
