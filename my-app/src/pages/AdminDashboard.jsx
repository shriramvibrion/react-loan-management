import { useEffect, useState } from "react";

export default function AdminDashboard({ navigate, onLogout }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("container"); // "container" or "list"
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/admin/loans");
        const data = await res.json();
        if (res.ok) {
          setLoans(data.loans || []);
        } else {
          setMessage(data.error || "Failed to load loans.");
        }
      } catch (err) {
        setMessage("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "rejected") return { bg: "#f8d7da", color: "#721c24" };
    if (s === "approved" || s === "accepted") return { bg: "#d4edda", color: "#155724" };
    return { bg: "#fff3cd", color: "#856404" };
  };

  const handleLoanClick = (loanId) => {
    navigate("admin-loan-detail", { loanId });
  };

  const normalizedLoans = loans.map((l) => ({
    ...l,
    _status: (l.status || "").toLowerCase(),
    _who: `${l.user_name || ""} ${l.user_email || ""}`.trim(),
  }));
  const loansByCreationOrder = [...normalizedLoans].sort((a, b) => {
    const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
    const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
    if (aDate !== bDate) return aDate - bDate;
    return (a.loan_id || 0) - (b.loan_id || 0);
  });
  const displayIdMap = new Map(
    loansByCreationOrder.map((loan, index) => [loan.loan_id, index + 1])
  );

  const filteredLoans = normalizedLoans.filter((l) => {
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
  });

  const countPending = normalizedLoans.filter((l) => l._status === "pending").length;
  const countApproved = normalizedLoans.filter(
    (l) => l._status === "approved" || l._status === "accepted"
  ).length;
  const countRejected = normalizedLoans.filter((l) => l._status === "rejected").length;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "22px 18px",
        boxSizing: "border-box",
        background:
          "radial-gradient(900px 600px at 18% 10%, rgba(255,138,51,0.20) 0%, rgba(255,138,51,0) 55%), linear-gradient(160deg, #f8fafc 0%, #f3f4f6 45%, #eef2f7 100%)",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#2d3748",
      }}
    >
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.12)",
          borderRadius: 18,
          padding: 18,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
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
                <button
                  onClick={() => setViewMode("container")}
                  style={{
                    padding: "8px 12px",
                    background: viewMode === "container" ? "#FF8A33" : "rgba(255,255,255,0.9)",
                    color: viewMode === "container" ? "#fff" : "#FF8A33",
                    border: "1px solid rgba(255,138,51,0.5)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 18,
                    transition: "all 0.2s",
                  }}
                  title="Container View"
                >
                  ⊞
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    padding: "8px 12px",
                    background: viewMode === "list" ? "#FF8A33" : "rgba(255,255,255,0.9)",
                    color: viewMode === "list" ? "#fff" : "#FF8A33",
                    border: "1px solid rgba(255,138,51,0.5)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 18,
                    transition: "all 0.2s",
                  }}
                  title="List View"
                >
                  ☰
                </button>
              </div>
              <button
                className="home-btn-orange"
                style={{
                  width: "auto",
                  padding: "10px 18px",
                  background: "rgba(255,255,255,0.9)",
                  color: "#FF8A33",
                  border: "1px solid rgba(255,138,51,0.5)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
                onClick={() => onLogout && onLogout()}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
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
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(0,0,0,0.05)",
                borderRadius: 14,
                padding: "12px 14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
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
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ fontSize: 15, color: "#5a6578", marginBottom: 16 }}>
            Loading loans...
          </div>
        )}

        {message && !loading && (
          <div style={{ color: "#FF8A33", marginBottom: 16 }}>{message}</div>
        )}

        {!loading && !message && loans.length === 0 && (
          <div
            style={{
              marginTop: 40,
              fontSize: 16,
              color: "#5a6578",
              textAlign: "center",
            }}
          >
            No loan applications yet.
          </div>
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
              return (
                <div
                  key={loan.loan_id}
                  onClick={() => handleLoanClick(loan.loan_id)}
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 26px rgba(0,0,0,0.12)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,138,51,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 10px rgba(0,0,0,0.06)";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
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
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#FF8A33",
                      }}
                    >
                      Loan #{displayIdMap.get(loan.loan_id)}
                    </span>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {loan.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#2d3748",
                      lineHeight: 1.7,
                    }}
                  >
                    <div><strong>User ID:</strong> {loan.user_id}</div>
                    <div><strong>Name:</strong> {loan.user_name || "N/A"}</div>
                    <div style={{ wordBreak: "break-word" }}><strong>Email:</strong> {loan.user_email}</div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      color: "#FF8A33",
                      fontWeight: 700,
                    }}
                  >
                    Click to view full details →
                  </div>
                </div>
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
              No results for “{query.trim()}”.
            </div>
          )}
      </div>
    </div>
  );
}

