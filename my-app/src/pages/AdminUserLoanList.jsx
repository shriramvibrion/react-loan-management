import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Loader from "../components/ui/Loader";
import Button from "../components/ui/Button";
import { fetchAdminUsersLoans } from "../services/loanService";
import { getStatusStyle } from "../utils/loanUtils";

const PAGE_SIZE = 10;

function StatusBadge({ status }) {
  const st = getStatusStyle(status || "");
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: st.bg,
        color: st.color,
        whiteSpace: "nowrap",
      }}
    >
      {status || "No Loan"}
    </span>
  );
}

export default function AdminUserLoanList({ navigate }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await fetchAdminUsersLoans({ q: query, status, page, pageSize: PAGE_SIZE });
        setRows(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load users and loans.");
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, status, page]);

  return (
    <DashboardLayout variant="orange">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 800, color: "#ea580c", letterSpacing: "-0.3px" }}>
            Users and Loan List
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Search users, filter by status, and open loan details quickly.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => navigate("admin-dashboard")} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
            Back
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10, marginBottom: 16 }}>
        <input
          className="input-field input-field-orange"
          placeholder="Search by user name, email, or loan ID"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
          style={{ background: "rgba(255,255,255,0.95)", border: "1.5px solid #fed7aa" }}
        />
        <select
          className="input-field input-field-orange"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          style={{ background: "rgba(255,255,255,0.95)", border: "1.5px solid #fed7aa" }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="under review">Under Review</option>
          <option value="accepted">Approved/Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="no-loan">No Loan</option>
        </select>
      </div>

      {loading && <Loader text="Loading users and loans..." />}

      {!loading && error && (
        <div style={{ marginBottom: 16, border: "1px solid #fed7aa", color: "#ea580c", background: "rgba(255,247,237,0.85)", borderRadius: 12, padding: 12, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Showing {rows.length} row(s) of {total}
          </div>

          <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 16, border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", borderBottom: "2px solid #fed7aa" }}>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>User Name</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Loan ID</th>
                  <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Loan Amount</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Loan Status</th>
                  <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>CIBIL Score</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.user_id}-${row.loan_id || `none-${index}`}`} style={{ borderBottom: "1px solid rgba(15,23,42,0.05)", background: index % 2 === 0 ? "transparent" : "rgba(248,250,252,0.7)" }}>
                    <td style={{ padding: "12px 14px", color: "#334155", fontWeight: 600 }}>{row.user_name || "N/A"}</td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>{row.email}</td>
                    <td style={{ padding: "12px 14px", color: "#334155", fontWeight: 700 }}>{row.loan_id ? `#${row.loan_id}` : "-"}</td>
                    <td style={{ padding: "12px 14px", color: "#334155", textAlign: "right", fontWeight: 700 }}>
                      {row.loan_amount != null ? `Rs ${Number(row.loan_amount).toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <StatusBadge status={row.loan_status} />
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#334155", fontWeight: 700 }}>
                      {row.cibil_score != null ? row.cibil_score : "-"}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      {row.loan_id ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate("admin-loan-detail", { loanId: row.loan_id })}
                          style={{ borderColor: "#fed7aa", color: "#ea580c" }}
                        >
                          View Details
                        </Button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No Loan</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#64748b", fontWeight: 500 }}>
                      No users or loans found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
