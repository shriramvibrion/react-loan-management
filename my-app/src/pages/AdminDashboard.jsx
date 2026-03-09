import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { fetchAdminLoans } from "../services/loanService";
import { getStatusStyle } from "../utils/loanUtils";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("container");
  const [statusFilter, setStatusFilter] = useState("all");

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
    navigate("/");
  }, [logout, navigate]);

  const handleLoanClick = useCallback(
    (loanId) => {
      navigate(`/admin/loan/${loanId}`);
    },
    [navigate]
  );

  const normalizedLoans = useMemo(
    () =>
      loans.map((l) => ({
        ...l,
        _status: (l.status || "").toLowerCase(),
        _who: `${l.user_name || ""} ${l.user_email || ""}`.trim(),
      })),
    [loans]
  );

  const displayIdMap = useMemo(() => {
    const loansByCreationOrder = [...normalizedLoans].sort((a, b) => {
      const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      return (a.loan_id || 0) - (b.loan_id || 0);
    });
    return new Map(loansByCreationOrder.map((loan, index) => [loan.loan_id, index + 1]));
  }, [normalizedLoans]);

  const filteredLoans = useMemo(
    () =>
      normalizedLoans.filter((l) => {
        const statusMatches =
          statusFilter === "all"
            ? true
            : statusFilter === "accepted"
            ? l._status === "approved" || l._status === "accepted"
            : l._status === statusFilter;

        if (!statusMatches) return false;

        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          String(l.loan_id).includes(q) ||
          String(displayIdMap.get(l.loan_id) || "").includes(q) ||
          String(l.user_email || "").toLowerCase().includes(q) ||
          String(l.user_name || "").toLowerCase().includes(q) ||
          String(l.status || "").toLowerCase().includes(q)
        );
      }),
    [normalizedLoans, statusFilter, query, displayIdMap]
  );

  const countPending = useMemo(
    () => normalizedLoans.filter((l) => l._status === "pending").length,
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

  return (
    <DashboardLayout variant="orange">
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 24,
              fontWeight: 900,
              color: "#FF8A33",
            }}
          >
            Loan Applications
          </div>
          <div style={{ fontSize: 14, color: "#5a6578", marginTop: 4 }}>
            Review, verify documents, and approve or reject requests.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "nowrap",
            justifyContent: "space-between",
            flex: 1,
            minWidth: 420,
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
              minWidth: 220,
              background: "rgba(255,255,255,0.9)",
              color: "#2d3748",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: "1px solid rgba(255,138,51,0.35)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              className="input-field input-field-orange"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: 170,
                background: "rgba(255,255,255,0.9)",
                color: "#2d3748",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: "1px solid rgba(255,138,51,0.35)",
              }}
            >
              <option value="all">All Status</option>
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <div style={{ display: "flex", gap: 6 }}>
              <Button
                variant={viewMode === "container" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("container")}
                title="Container View"
                style={{ borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
              >
                ⊞
              </Button>
              <Button
                variant={viewMode === "list" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("list")}
                title="List View"
                style={{ borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
              >
                ☰
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
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
          marginBottom: 16,
        }}
      >
        {[
          { label: "Total", value: normalizedLoans.length, accent: "#FF8A33" },
          { label: "Pending", value: countPending, accent: "#FF8A33" },
          { label: "Approved", value: countApproved, accent: "#16a34a" },
          { label: "Rejected", value: countRejected, accent: "#dc2626" },
        ].map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 12, color: "#5a6578", fontWeight: 800 }}>
              {s.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: s.accent,
                marginTop: 4,
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
            background: "rgba(255,138,51,0.06)",
            border: "1px solid rgba(255,138,51,0.35)",
            color: "#FF8A33",
            fontWeight: 700,
          }}
        >
          {message}
        </Card>
      )}

      {!loading && !message && loans.length === 0 && (
        <EmptyState
          icon="📋"
          title="No loan applications yet"
          description="Loan applications from users will appear here."
        />
      )}

      {!loading && !message && filteredLoans.length > 0 && viewMode === "container" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filteredLoans.map((loan) => {
            const st = getStatusStyle(loan.status);
            const tone =
              st.bg === "#d4edda"
                ? "success"
                : st.bg === "#f8d7da"
                ? "danger"
                : "warning";
            return (
              <Card
                key={loan.loan_id}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onClick={() => handleLoanClick(loan.loan_id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,23,42,0.08)";
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
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#FF8A33" }}>
                    Loan #{displayIdMap.get(loan.loan_id)}
                  </span>
                  <Badge tone={tone}>{loan.status}</Badge>
                </div>

                <div style={{ fontSize: 13, color: "#2d3748", lineHeight: 1.7 }}>
                  <div><strong>User ID:</strong> {loan.user_id}</div>
                  <div><strong>Name:</strong> {loan.user_name || "N/A"}</div>
                  <div style={{ wordBreak: "break-word" }}>
                    <strong>Email:</strong> {loan.user_email}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: "#FF8A33", fontWeight: 700 }}>
                  Click to view full details →
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !message && filteredLoans.length > 0 && viewMode === "list" && (
        <div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,138,51,0.1)", borderBottom: "2px solid rgba(255,138,51,0.3)" }}>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 800, color: "#2d3748" }}>Loan No.</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 800, color: "#2d3748" }}>User ID</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 800, color: "#2d3748" }}>Name</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 800, color: "#2d3748" }}>Email</th>
                <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 800, color: "#2d3748" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan) => {
                const st = getStatusStyle(loan.status);
                return (
                  <tr
                    key={loan.loan_id}
                    onClick={() => handleLoanClick(loan.loan_id)}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,138,51,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px", fontSize: 14, fontWeight: 700, color: "#FF8A33" }}>#{displayIdMap.get(loan.loan_id)}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#2d3748" }}>{loan.user_id}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#2d3748" }}>{loan.user_name || "N/A"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#2d3748", wordBreak: "break-word" }}>{loan.user_email}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
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
          <div style={{ marginTop: 40, textAlign: "center", color: "#5a6578" }}>
            No results for "{query.trim()}".
          </div>
        )}
    </DashboardLayout>
  );
}