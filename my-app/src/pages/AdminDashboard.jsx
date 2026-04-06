import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchAdminLoans } from "../services/loanService";
import { getStatusStyle } from "../utils/loanUtils";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";

export default function AdminDashboard({ navigate, onLogout }) {
  const { logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("container");
  const [statusFilter, setStatusFilter] = useState("all");

  const go = useCallback(
    (target, params = {}) => {
      if (typeof navigate === "function") {
        navigate(target, params);
        return;
      }

      // In this app shell, page transitions are handled via the `navigate` prop.
    },
    [navigate]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchAdminLoans();
        setLoans(items);
        setMessage("");
      } catch (err) {
        setMessage(err.message || "Failed to load loans.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    go("index");
  }, [logout, go]);

  const normalizedLoans = useMemo(
    () =>
      loans.map((l) => ({
        ...l,
        _status: (l.status || "").toLowerCase(),
        _who: `${l.user_name || ""} ${l.user_email || ""}`.trim(),
      })),
    [loans]
  );

  const handleLoanClick = useCallback(
    (loanId) => {
      go("admin-loan-detail", { loanId });
    },
    [go]
  );

  const filteredLoans = useMemo(
    () =>
      normalizedLoans.filter((l) => {
        const statusMatches =
          statusFilter === "all"
            ? true
            : statusFilter === "accepted"
            ? l._status === "approved" || l._status === "accepted"
            : statusFilter === "under review"
            ? l._status === "under review"
            : l._status === statusFilter;

        if (!statusMatches) return false;

        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          String(l.loan_id).includes(q) ||
          String(l.user_email || "").toLowerCase().includes(q) ||
          String(l.user_name || "").toLowerCase().includes(q) ||
          String(l.status || "").toLowerCase().includes(q)
        );
      }),
    [normalizedLoans, statusFilter, query]
  );

  const countPending = useMemo(
    () => normalizedLoans.filter((l) => l._status === "pending").length,
    [normalizedLoans]
  );
  const countUnderReview = useMemo(
    () => normalizedLoans.filter((l) => l._status === "under review").length,
    [normalizedLoans]
  );
  const countApproved = useMemo(
    () => normalizedLoans.filter((l) => l._status === "approved" || l._status === "accepted").length,
    [normalizedLoans]
  );
  const countRejected = useMemo(
    () => normalizedLoans.filter((l) => l._status === "rejected").length,
    [normalizedLoans]
  );
  const countRework = useMemo(
    () => normalizedLoans.filter((l) => l._status === "rework").length,
    [normalizedLoans]
  );

  return (
    <DashboardLayout variant="orange">
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "#ea580c",
              letterSpacing: "-0.3px",
            }}
          >
            Loan Applications
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>
            Review, verify documents, and approve or reject requests.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
            flex: 1,
            minWidth: 0,
            paddingBottom: 2,
          }}
        >
          <input
            className="input-field input-field-orange"
            placeholder="Search by loan id / name / email / status"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              background: "rgba(255,255,255,0.95)",
              color: "#1e293b",
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              border: "1.5px solid #fed7aa",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              className="input-field input-field-orange"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: 170,
                background: "rgba(255,255,255,0.95)",
                color: "#1e293b",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                border: "1.5px solid #fed7aa",
              }}
            >
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="under review">Under Review</option>
              <option value="rework">Rework</option>
              <option value="rejected">Rejected</option>
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              <Button
                variant={viewMode === "container" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("container")}
                title="Container View"
                style={{
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 14,
                  ...(viewMode === "container" ? { background: "linear-gradient(135deg, #f97316, #ea580c)" } : {}),
                }}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("list")}
                title="List View"
                style={{
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 14,
                  ...(viewMode === "list" ? { background: "linear-gradient(135deg, #f97316, #ea580c)" } : {}),
                }}
              >
                List
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => go("admin-analytics")} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
              Analytics
            </Button>
            <Button variant="secondary" size="sm" onClick={() => go("admin-users-loans")} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
              Users and Loans
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLogout} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total", value: normalizedLoans.length, accent: "#f97316" },
          { label: "Pending", value: countPending, accent: "#f59e0b" },
          { label: "Under Review", value: countUnderReview, accent: "#6366f1" },
          { label: "Rework", value: countRework, accent: "#2563eb" },
          { label: "Approved", value: countApproved, accent: "#10b981" },
          { label: "Rejected", value: countRejected, accent: "#f43f5e" },
        ].map((s) => (
          <Card key={s.label} style={{ border: "1px solid rgba(203,213,225,0.55)", background: "rgba(247,249,252,0.9)", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {s.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: s.accent,
                marginTop: 6,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      {loading && <Loader text="Loading loans..." />}

      {message && !loading && (
        <Card
          style={{
            marginBottom: 16,
            background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
            border: "1px solid #fed7aa",
            color: "#ea580c",
            fontWeight: 600,
          }}
        >
          {message}
        </Card>
      )}

      {!loading && !message && loans.length === 0 && (
        <EmptyState
          icon="List"
          title="No loan applications yet"
          description="Loan applications from users will appear here."
        />
      )}

      {!loading && !message && filteredLoans.length > 0 && viewMode === "container" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
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
            const isNew = !loan.viewed_by_admin && (loan._status === "pending" || loan._status === "under review");
            return (
              <Card
                key={loan.loan_id}
                style={{
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  border: "1px solid rgba(203,213,225,0.55)",
                  boxShadow: isNew ? "0 0 0 2px rgba(99,102,241,0.18), 0 4px 16px rgba(99,102,241,0.10)" : undefined,
                  background: isNew ? "rgba(238,242,255,0.75)" : "rgba(247,249,252,0.9)",
                }}
                onClick={() => handleLoanClick(loan.loan_id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 28px rgba(15,23,42,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.06)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#ea580c", fontFamily: "'Montserrat', sans-serif" }}>
                    Loan #{loan.loan_id}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isNew && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#4338ca",
                        background: "#e0e7ff",
                        border: "1px solid #c7d2fe",
                        borderRadius: 999,
                        padding: "3px 8px",
                      }}>
                        NEW
                      </span>
                    )}
                    <Badge tone={tone}>{loan.status}</Badge>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#64748b" }}>User ID:</span> <strong>{loan.user_id}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Name:</span> <strong>{loan.user_name || "N/A"}</strong></div>
                  <div style={{ wordBreak: "break-word" }}>
                    <span style={{ color: "#64748b" }}>Email:</span> <strong>{loan.user_email}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: "#f97316", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  View full details
                  <span style={{ fontSize: 14 }}>-</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !message && filteredLoans.length > 0 && viewMode === "list" && (
        <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 16, overflow: "auto", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderBottom: "2px solid #fed7aa" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Loan No.</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>User ID</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan, idx) => {
                const st = getStatusStyle(loan.status);
                const isNew = !loan.viewed_by_admin && ((loan._status || "") === "pending" || (loan._status || "") === "under review");
                return (
                  <tr
                    key={loan.loan_id}
                    onClick={() => handleLoanClick(loan.loan_id)}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(15,23,42,0.04)",
                      transition: "all 0.15s ease",
                      background: isNew ? "rgba(224,231,255,0.35)" : idx % 2 === 0 ? "transparent" : "rgba(248,250,252,0.5)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,247,237,0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isNew ? "rgba(224,231,255,0.35)" : idx % 2 === 0 ? "transparent" : "rgba(248,250,252,0.5)";
                    }}
                  >
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>#{loan.loan_id}{isNew ? " * NEW" : ""}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#334155" }}>{loan.user_id}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#334155", fontWeight: 500 }}>{loan.user_name || "N/A"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#334155", wordBreak: "break-word" }}>{loan.user_email}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                          display: "inline-block",
                        }}
                      >
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading &&
        !message &&
        normalizedLoans.length > 0 &&
        filteredLoans.length === 0 && (
          <div style={{ marginTop: 40, textAlign: "center", color: "#64748b", fontWeight: 500 }}>
            No results for "{query.trim()}".
          </div>
        )}
    </DashboardLayout>
  );
}