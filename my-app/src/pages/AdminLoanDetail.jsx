import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../api";
import {
  fetchAdminLoanDetail,
  updateAdminLoanStatus,
} from "../services/loanService";
import { monthDiff } from "../utils/loanUtils";
import Loader from "../components/ui/Loader";
import Section from "../components/ui/Section";
import InfoRow from "../components/ui/InfoRow";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { useToast } from "../context/ToastContext";

export default function AdminLoanDetail() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const location = useLocation();
  const displayId = location.state?.displayId || loanId;
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const onBack = () => navigate("/admin/dashboard");

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
      toast.success(json.message || `Loan ${newStatus.toLowerCase()}.`);
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
        className="page-bg-image"
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0) 55%), linear-gradient(160deg, #fffbf5 0%, #f8fafc 45%, #f1f5f9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader text="Loading loan details..." size={36} />
      </div>
    );
  }

  if (message && !data) {
    return (
      <div
        className="page-bg-image"
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0) 55%), linear-gradient(160deg, #fffbf5 0%, #f8fafc 45%, #f1f5f9 100%)",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            width: "min(1120px, 96vw)",
            margin: "0 auto",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(249,115,22,0.08)",
            boxShadow: "0 18px 60px rgba(15, 23, 42, 0.08)",
            borderRadius: 20,
            padding: 24,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <div style={{ color: "#ea580c", marginBottom: 16, fontWeight: 600 }}>
            {message}
          </div>
          <button className="home-btn-orange" onClick={onBack}>
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

  return (
    <div
      className="page-bg-image"
      style={{
        height: "100vh",
        width: "100vw",
        padding: "22px 18px",
        boxSizing: "border-box",
        background:
          "radial-gradient(900px 600px at 18% 10%, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0) 55%), linear-gradient(160deg, #fffbf5 0%, #f8fafc 45%, #f1f5f9 100%)",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#1e293b",
      }}
    >
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(249,115,22,0.08)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.08)",
          borderRadius: 20,
          padding: 24,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
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
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: "#c2410c",
                letterSpacing: "-0.3px",
              }}
            >
              Loan #{displayId} - Review Application
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
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
                background: "rgba(255,255,255,0.95)",
                color: "#ea580c",
                border: "1px solid rgba(249,115,22,0.25)",
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                borderRadius: 10,
              }}
              onClick={onBack}
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
              background: "rgba(249,115,22,0.06)",
              color: "#ea580c",
              marginBottom: 16,
              fontWeight: 600,
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
            <Section title="Loan Details" variant="orange">
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
              <Section title="Applicant Details" variant="orange">
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

            <Section title="Uploaded Documents" variant="orange">
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
                        background: "rgba(255,255,255,0.85)",
                        borderRadius: 12,
                        flexWrap: "wrap",
                        gap: 10,
                        border: "1px solid rgba(15,23,42,0.05)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{doc.document_type}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{doc.original_filename}</div>
                      </div>
                      <a
                        href={docViewUrl(doc.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "8px 16px",
                          borderRadius: 10,
                          background: "linear-gradient(135deg, #f97316, #ea580c)",
                          color: "#fff",
                          textDecoration: "none",
                          fontWeight: 700,
                          fontSize: 13,
                          boxShadow: "0 4px 12px rgba(249,115,22,0.25)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>No documents uploaded.</div>
              )}
            </Section>

            {isPending && (
              <Section title="Decision" variant="orange">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Button
                    variant="primary"
                    onClick={() => setConfirmAction("Approved")}
                    disabled={actionLoading}
                    style={{
                      background: "linear-gradient(135deg, #16a34a, #15803d)",
                      boxShadow: "0 10px 22px rgba(22,163,74,0.18)",
                    }}
                  >
                    {actionLoading ? "Processing..." : "Accept"}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setConfirmAction("Rejected")}
                    disabled={actionLoading}
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      boxShadow: "0 10px 22px rgba(239,68,68,0.18)",
                    }}
                  >
                    {actionLoading ? "Processing..." : "Reject"}
                  </Button>
                </div>
              </Section>
            )}

            <Modal
              open={!!confirmAction}
              title={`Confirm ${confirmAction === "Approved" ? "Approval" : "Rejection"}`}
              onClose={() => setConfirmAction(null)}
            >
              <p style={{ color: "#475569", marginBottom: 20 }}>
                Are you sure you want to {confirmAction === "Approved" ? "approve" : "reject"} Loan #{displayId}?
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleStatusUpdate(confirmAction);
                    setConfirmAction(null);
                  }}
                  style={{
                    background: confirmAction === "Approved"
                      ? "linear-gradient(135deg, #16a34a, #15803d)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
                  }}
                >
                  {confirmAction === "Approved" ? "Approve" : "Reject"}
                </Button>
              </div>
            </Modal>

            {!isPending && (
              <div style={{ marginTop: 16, color: "#64748b", fontSize: 14 }}>
                This loan has already been {loan?.status?.toLowerCase()}.
              </div>
            )}
          </div>

          {isAccepted && (
            <div
              style={{
                position: "sticky",
                top: 12,
                background: "linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)",
                borderRadius: 20,
                padding: 22,
                border: "1px solid rgba(249,115,22,0.1)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#c2410c", lineHeight: 1.1, fontFamily: "'Montserrat', sans-serif" }}>
                  Loan #{displayId} Analytics
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
                <div style={{ background: "#fff7ed", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Amount</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>Rs {amount.toLocaleString()}</div>
                </div>
                <div style={{ background: "#fff7ed", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>EMI</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>Rs {Math.round(emi).toLocaleString()}</div>
                </div>
                <div style={{ background: "#fff7ed", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Tenure</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>{tenure} months</div>
                </div>
              </div>

              <div style={{ fontSize: 17, fontWeight: 800, color: "#c2410c", marginBottom: 10, fontFamily: "'Montserrat', sans-serif" }}>Amount Progress</div>
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

              <div style={{ fontSize: 17, fontWeight: 800, color: "#c2410c", marginBottom: 10, fontFamily: "'Montserrat', sans-serif" }}>Month Completion</div>
              <div style={{ height: 12, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${monthPercent}%`, height: "100%", background: "linear-gradient(90deg, #f97316, #ea580c)", transition: "width 0.6s ease" }} />
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
