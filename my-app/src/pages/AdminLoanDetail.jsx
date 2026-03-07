import { useEffect, useState } from "react";

const API = "http://localhost:5000";

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

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/admin/loans/${loanId}`);
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setMessage(json.error || "Failed to load loan details.");
        }
      } catch (err) {
        setMessage("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [loanId]);

  const handleStatusUpdate = async (newStatus) => {
    if (!loanId || actionLoading) return;
    try {
      setActionLoading(true);
      setMessage("");
      const res = await fetch(`${API}/api/admin/loans/${loanId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(json.message || `Loan ${newStatus.toLowerCase()}.`);
        setData((prev) =>
          prev
            ? { ...prev, loan: { ...prev.loan, status: newStatus } }
            : null
        );
      } else {
        setMessage(json.error || "Failed to update status.");
      }
    } catch (err) {
      setMessage("Server error. Please try again.");
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
  const docViewUrl = (docId) => `${API}/api/admin/document/${docId}`;

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
      <span style={{ color: "#2d3748" }}>{value ?? "—"}</span>
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
        {/* Header */}
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
              Loan #{loan?.loan_id} — Review Application
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
                  loan?.status?.toLowerCase() === "pending"
                    ? "#fff3cd"
                    : loan?.status?.toLowerCase() === "rejected"
                    ? "#f8d7da"
                    : "#d4edda",
                color:
                  loan?.status?.toLowerCase() === "pending"
                    ? "#856404"
                    : loan?.status?.toLowerCase() === "rejected"
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

        {/* Loan details */}
        <Section title="Loan Details">
          <InfoRow
            label="Loan Amount"
            value={`₹${Number(loan?.loan_amount || 0).toLocaleString()}`}
          />
          <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
          <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
          <InfoRow label="EMI" value={`₹${Number(loan?.emi || 0).toFixed(2)}`} />
          <InfoRow
            label="Applied Date"
            value={
              loan?.applied_date
                ? new Date(loan.applied_date).toLocaleString()
                : null
            }
          />
          <InfoRow label="User" value={loan?.user_name || loan?.user_email} />
        </Section>

        {/* Applicant details */}
        {applicant && (
          <Section title="Applicant Details">
            <InfoRow label="Full Name" value={applicant.full_name} />
            <InfoRow label="Contact Email" value={applicant.contact_email} />
            <InfoRow label="Primary Mobile" value={applicant.primary_mobile} />
            <InfoRow
              label="Alternate Mobile"
              value={applicant.alternate_mobile}
            />
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
                  ? `₹${Number(applicant.monthly_income).toLocaleString()}`
                  : null
              }
            />
            <InfoRow label="Employer" value={applicant.employer_name} />
            <InfoRow label="Employment Type" value={applicant.employment_type} />
            <InfoRow label="Loan Purpose" value={applicant.loan_purpose} />
            {applicant.notes && <InfoRow label="Notes" value={applicant.notes} />}
          </Section>
        )}

        {/* Documents */}
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
                    <div style={{ fontWeight: 800, color: "#2d3748" }}>
                      {doc.document_type}
                    </div>
                    <div style={{ fontSize: 12, color: "#5a6578" }}>
                      {doc.original_filename}
                    </div>
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

        {/* Accept / Reject */}
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
                {actionLoading ? "Processing..." : "✓ Accept"}
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
                {actionLoading ? "Processing..." : "✗ Reject"}
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
    </div>
  );
}
