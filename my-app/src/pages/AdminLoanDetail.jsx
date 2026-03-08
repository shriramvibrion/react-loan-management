import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import {
  fetchAdminLoanDetail,
  updateAdminLoanStatus,
} from "../loanService";

function monthDiff(fromDate, toDate) {
  const years = toDate.getFullYear() - fromDate.getFullYear();
  const months = toDate.getMonth() - fromDate.getMonth();
  return years * 12 + months;
}

export default function AdminLoanDetail({ navigate, loanId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loanId) {
      setLoading(false);
      setMessage("No loan selected.");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const json = await fetchAdminLoanDetail(loanId);
        setData(json);
        setMessage("");
      } catch (err) {
        setMessage(err.message || "Failed to load loan details.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId]);

  const handleStatusUpdate = async (newStatus) => {
    if (!loanId || actionLoading) return;
    try {
      setActionLoading(true);
      setMessage("");
      const json = await updateAdminLoanStatus(loanId, newStatus);
      setMessage(json.message || `Loan ${newStatus.toLowerCase()}.`);
      setData((prev) =>
        prev ? { ...prev, loan: { ...prev.loan, status: newStatus } } : null
      );
    } catch (err) {
      setMessage(err.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const isPending = data?.loan?.status?.toLowerCase() === "pending";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(255,138,51,0.20) 0%, rgba(255,138,51,0) 55%), linear-gradient(160deg, #f8fafc 0%, #f3f4f6 45%, #eef2f7 100%)",
          color: "#2d3748",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          Loading loan details...
        </div>
      </div>
    );
  }

  if (message && !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(255,138,51,0.20) 0%, rgba(255,138,51,0) 55%), linear-gradient(160deg, #f8fafc 0%, #f3f4f6 45%, #eef2f7 100%)",
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
          <div style={{ color: "#FF8A33", marginBottom: 16, fontWeight: 700 }}>
            {message}
          </div>
          <button className="home-btn-orange" onClick={() => onBack()}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { loan, applicant, documents } = data || {};
  const docViewUrl = (docId) => `${API_BASE_URL}/api/admin/document/${docId}`;
  const status = (loan?.status || "").toLowerCase();
  const isAccepted = status === "approved" || status === "accepted";

  const amount = Number(loan?.loan_amount || 0);
  const emi = Number(loan?.emi || 0);
  const tenure = Number(loan?.tenure || 0);
  const applied = loan?.applied_date ? new Date(loan.applied_date) : null;
  const elapsedRaw = applied ? monthDiff(applied, new Date()) : 0;
  const completedMonths = isAccepted ? Math.min(tenure, Math.max(0, elapsedRaw)) : 0;
  const remainingMonths = Math.max(0, tenure - completedMonths);
  const paidAmount = tenure > 0 ? amount * (completedMonths / tenure) : 0;
  const remainingAmount = Math.max(0, amount - paidAmount);
  const paidPercent = amount > 0 ? Math.round((paidAmount / amount) * 100) : 0;
  const monthPercent = tenure > 0 ? Math.round((completedMonths / tenure) * 100) : 0;

  const Section = ({ title, children }) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#FF8A33",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginBottom: 8,
        fontSize: 14,
      }}
    >
      <span style={{ color: "#5a6578", minWidth: 140 }}>{label}:</span>
      <span style={{ color: "#2d3748" }}>{value ?? "-"}</span>
    </div>
  );

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
                fontSize: 22,
                fontWeight: 900,
                color: "#FF8A33",
              }}
            >
              Loan #{loan?.loan_id} - Review Application
            </div>
            <div style={{ fontSize: 14, color: "#5a6578", marginTop: 4 }}>
              Verify applicant details and documents
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background:
                  status === "pending"
                    ? "#fff3cd"
                    : status === "rejected"
                    ? "#f8d7da"
                    : "#d4edda",
                color:
                  status === "pending"
                    ? "#856404"
                    : status === "rejected"
                    ? "#721c24"
                    : "#155724",
              }}
            >
              {loan?.status}
            </span>
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
              onClick={() => onBack()}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(255,138,51,0.10)",
              color: "#FF8A33",
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isAccepted ? "1.5fr 1fr" : "1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <Section title="Loan Details">
              <InfoRow label="Loan Amount" value={`Rs ${amount.toLocaleString()}`} />
              <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
              <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
              <InfoRow label="EMI" value={`Rs ${Number(loan?.emi || 0).toFixed(2)}`} />
              <InfoRow
                label="Applied Date"
                value={loan?.applied_date ? new Date(loan.applied_date).toLocaleString() : null}
              />
              <InfoRow label="User" value={loan?.user_name || loan?.user_email} />
            </Section>

            {applicant && (
              <Section title="Applicant Details">
                <InfoRow label="Full Name" value={applicant.full_name} />
                <InfoRow label="Contact Email" value={applicant.contact_email} />
                <InfoRow label="Primary Mobile" value={applicant.primary_mobile} />
                <InfoRow label="Alternate Mobile" value={applicant.alternate_mobile} />
                <InfoRow label="Date of Birth" value={applicant.dob} />
                <InfoRow label="Address Line 1" value={applicant.address_line1} />
                <InfoRow label="Address Line 2" value={applicant.address_line2} />
                <InfoRow label="City" value={applicant.city} />
                <InfoRow label="State" value={applicant.state} />
                <InfoRow label="Postal Code" value={applicant.postal_code} />
                <InfoRow label="PAN Number" value={applicant.pan_number} />
                <InfoRow label="Aadhaar Number" value={applicant.aadhaar_number} />
                <InfoRow
                  label="Monthly Income"
                  value={
                    applicant.monthly_income != null
                      ? `Rs ${Number(applicant.monthly_income).toLocaleString()}`
                      : null
                  }
                />
                <InfoRow label="Employer" value={applicant.employer_name} />
                <InfoRow label="Employment Type" value={applicant.employment_type} />
                <InfoRow label="Loan Purpose" value={applicant.loan_purpose} />
                {applicant.notes && <InfoRow label="Notes" value={applicant.notes} />}
              </Section>
            )}

            <Section title="Uploaded Documents">
              {documents?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.75)",
                        borderRadius: 10,
                        flexWrap: "wrap",
                        gap: 10,
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "#2d3748" }}>{doc.document_type}</div>
                        <div style={{ fontSize: 12, color: "#5a6578" }}>{doc.original_filename}</div>
                      </div>
                      <a
                        href={docViewUrl(doc.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "#FF8A33",
                          color: "#fff",
                          textDecoration: "none",
                          fontWeight: 800,
                          fontSize: 13,
                          boxShadow: "0 8px 18px rgba(255,138,51,0.22)",
                        }}
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#5a6578" }}>No documents uploaded.</div>
              )}
            </Section>

            {isPending && (
              <Section title="Decision">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    className="btn-orange"
                    style={{
                      width: "auto",
                      padding: "12px 24px",
                      background: "linear-gradient(135deg, #16a34a, #15803d)",
                      marginTop: 0,
                      boxShadow: "0 10px 22px rgba(22,163,74,0.18)",
                    }}
                    onClick={() => handleStatusUpdate("Approved")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Accept"}
                  </button>
                  <button
                    className="btn-orange"
                    style={{
                      width: "auto",
                      padding: "12px 24px",
                      marginTop: 0,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      boxShadow: "0 10px 22px rgba(239,68,68,0.18)",
                    }}
                    onClick={() => handleStatusUpdate("Rejected")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Reject"}
                  </button>
                </div>
              </Section>
            )}

            {!isPending && (
              <div style={{ marginTop: 16, color: "#5a6578", fontSize: 14 }}>
                This loan has already been {loan?.status?.toLowerCase()}.
              </div>
            )}
          </div>

          {isAccepted && (
            <div
              style={{
                position: "sticky",
                top: 12,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                borderRadius: 18,
                padding: 18,
                border: "1px solid #dbe4f2",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#102a56", lineHeight: 1.1 }}>
                  Loan #{loan?.loan_id} Analytics
                </div>
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#166534",
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.3,
                  }}
                >
                  Accepted
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                Applied: {loan?.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#f1f6ff", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Amount</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>Rs {amount.toLocaleString()}</div>
                </div>
                <div style={{ background: "#f1f6ff", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>EMI</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>Rs {Math.round(emi).toLocaleString()}</div>
                </div>
                <div style={{ background: "#f1f6ff", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Tenure</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>{tenure} months</div>
                </div>
              </div>

              <div style={{ fontSize: 17, fontWeight: 800, color: "#102a56", marginBottom: 10 }}>Amount Progress</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 44px", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, color: "#334155", fontWeight: 700 }}>Paid</div>
                  <div style={{ height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${paidPercent}%`, height: "100%", background: "#16a34a" }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{paidPercent}%</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 44px", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, color: "#334155", fontWeight: 700 }}>Remaining</div>
                  <div style={{ height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(0, 100 - paidPercent)}%`, height: "100%", background: "#ef4444" }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{Math.max(0, 100 - paidPercent)}%</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                Paid: Rs {Math.round(paidAmount).toLocaleString()} | Remaining: Rs {Math.round(remainingAmount).toLocaleString()}
              </div>

              <div style={{ fontSize: 17, fontWeight: 800, color: "#102a56", marginBottom: 10 }}>Month Completion</div>
              <div style={{ height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${monthPercent}%`, height: "100%", background: "#2563eb" }} />
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Completed: {completedMonths} month(s) | Remaining: {remainingMonths} month(s) ({monthPercent}% completed)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
