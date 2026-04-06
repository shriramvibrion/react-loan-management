import { useEffect, useState, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../auth/AuthContext";
import { useParams } from "react-router-dom";
import { fetchUserLoanDetail, reuploadRejectedDocument } from "../services/loanService";
import Loader from "../components/ui/Loader";
import Section from "../components/ui/Section";
import InfoRow from "../components/ui/InfoRow";
import { generateLoanPDF } from "../utils/pdfReport";
import { fetchLoanReportData } from "../services/loanService";

export default function UserLoanDetail({ navigate, userEmail: userEmailProp, loanId: loanIdProp, onBack }) {
  const { userEmail: sessionUserEmail } = useAuth();
  const { loanId: routeLoanId } = useParams();
  const resolvedLoanId = loanIdProp ?? (routeLoanId ? Number(routeLoanId) : null);
  const resolvedUserEmail = userEmailProp || sessionUserEmail;
  const go = (target, params = {}) => {
    if (typeof navigate === "function") {
      navigate(target, params);
    }
  };
  const displayId = resolvedLoanId;
  const toast = useToast();
  const userEmail = resolvedUserEmail;
  const loanId = resolvedLoanId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingDocumentId, setUploadingDocumentId] = useState(null);
  const fileInputRefs = useRef({});

  const reloadLoanDetail = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const json = await fetchUserLoanDetail(loanId, userEmail);
      setData(json);
      setMessage("");
    } catch (err) {
      if (showLoader) {
        setMessage(err.message || "Failed to load loan details.");
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (!loanId || !userEmail) {
      setLoading(false);
      setMessage("No loan selected.");
      return;
    }

    reloadLoanDetail(true);

    const refreshInterval = setInterval(async () => {
      try {
        const json = await fetchUserLoanDetail(loanId, userEmail);
        setData(json);
      } catch (_) {
        // Silent background refresh failure; manual actions still surface errors.
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [loanId, userEmail]);

  const handleDownloadPDF = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const reportData = await fetchLoanReportData(loanId, userEmail, "user");
      generateLoanPDF(reportData);
      toast.success("PDF report downloaded!");
    } catch (err) {
      toast.error(err.message || "Failed to generate report.");
    } finally {
      setDownloading(false);
    }
  };

  const getDocumentBadgeStyle = (status) => {
    const normalized = (status || "under_review").toLowerCase();
    if (normalized === "accepted") {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid rgba(22,101,52,0.2)",
      };
    }
    if (normalized === "rejected") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid rgba(153,27,27,0.2)",
      };
    }
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid rgba(146,64,14,0.2)",
    };
  };

  const handleReuploadClick = (doc) => {
    // Trigger hidden file input
    fileInputRefs.current[doc.document_id]?.click();
  };

  const handleFileSelect = async (documentId, file) => {
    if (!file) return;

    // Find the document object
    const doc = data?.documents?.find((d) => d.document_id === documentId);
    if (!doc) return;

    try {
      setUploadingDocumentId(documentId);
      const json = await reuploadRejectedDocument(documentId, userEmail, file);
      const updatedDocument = json?.document;

      setData((prev) => {
        if (!prev?.documents) return prev;
        return {
          ...prev,
          documents: prev.documents.map((item) =>
            item.document_id === documentId
              ? {
                  ...item,
                  ...updatedDocument,
                }
              : item
          ),
        };
      });

      toast.success(json?.message || "Document re-uploaded successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to re-upload document.");
    } finally {
      setUploadingDocumentId(null);
      // Reset the file input
      if (fileInputRefs.current[documentId]) {
        fileInputRefs.current[documentId].value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="page-bg-image loan-app-bg loan-details-bg user-loan-details-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)" }}>
        <Loader text="Loading loan details..." size={36} />
      </div>
    );
  }

  if (message && !data) {
    return (
      <div className="page-bg-image loan-app-bg loan-details-bg user-loan-details-bg" style={{ minHeight: "100vh", padding: 22,background: "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)", color: "#0f172a" }}>
        <div style={{ width: "min(1120px, 96vw)", margin: "0 auto", background: "rgba(238,243,252,0.84)", border: "1px solid rgba(255,255,255,0.72)", borderRadius: 18, padding: 18, boxShadow: "0 20px 58px rgba(15, 23, 42, 0.08)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
          <div style={{ color: "#4338ca", marginBottom: 16, fontWeight: 700 }}>{message}</div>
          <button className="home-btn-blue" onClick={() => go("user-dashboard")}>Back</button>
        </div>
      </div>
    );
  }

  const { loan, applicant, documents, coapplicants, guarantors } = data || {};
  const status = (loan?.status || "").toLowerCase();
  const loanStatusNormalized =
    status === "under review" || status === "under_review" || status === "pending"
      ? "under_review"
      : status;
  const loanStatusLabel = loanStatusNormalized === "under_review" ? "Under Review" : (loan?.status || "");

  return (
    <div
      className="page-bg-image loan-app-bg loan-details-bg user-loan-details-bg"
      style={{
        height: "100vh",
        width: "100vw",
        padding: "22px 18px",
        boxSizing: "border-box",
        background: "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#0f172a",
      
      }}
    >
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          background: "rgba(238,243,252,0.84)",
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow: "0 20px 58px rgba(15, 23, 42, 0.08)",
          borderRadius: 20,
          padding: 24,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 800, color: "#312e81", letterSpacing: "-0.3px" }}>
              Loan #{displayId} — Details
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              View your application status, details, and documents
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
                  loanStatusNormalized === "under_review"
                    ? "#fef3c7"
                    : loanStatusNormalized === "rejected"
                      ? "#fee2e2"
                      : "#dcfce7",
                color:
                  loanStatusNormalized === "under_review"
                    ? "#92400e"
                    : loanStatusNormalized === "rejected"
                      ? "#991b1b"
                      : "#166534",
              }}
            >
              {loanStatusLabel}
            </span>
            <button
              onClick={() => reloadLoanDetail(false)}
              disabled={refreshing}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#312e81",
                border: "1px solid rgba(99,102,241,0.25)",
                fontWeight: 700,
                fontSize: 13,
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.65 : 1,
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              {refreshing ? "Refreshing..." : "Refresh now"}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #4338ca)",
                color: "var(--text-on-accent)",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.5 : 1,
                boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                transition: "all 0.2s ease",
              }}
            >
              {downloading ? "Generating..." : "📄 Download PDF"}
            </button>
            <button
              className="home-btn-blue"
              style={{ width: "auto", padding: "10px 18px", background: "rgba(255,255,255,0.95)", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", borderRadius: 10 }}
              onClick={() => go("user-dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(99,102,241,0.06)", color: "#4338ca", marginBottom: 16, fontWeight: 600 }}>
            {message}
          </div>
        )}

        <Section title="Loan Overview">
          <InfoRow label="Loan Amount" value={`Rs ${Number(loan?.loan_amount || 0).toLocaleString()}`} />
          <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
          <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
          <InfoRow label="EMI" value={`Rs ${Number(loan?.emi || 0).toFixed(2)}`} />
          <InfoRow label="Applied Date" value={loan?.applied_date ? new Date(loan.applied_date).toLocaleString() : null} />
        </Section>

        {applicant && (
          <Section title="Applicant Details">
            <InfoRow label="Full Name" value={applicant.full_name} />
            <InfoRow label="Date of Birth" value={applicant.dob} />
            <InfoRow label="Address" value={[applicant.address_line1, applicant.address_line2, applicant.city, applicant.state, applicant.postal_code].filter(Boolean).join(", ")} />
            <InfoRow label="PAN Number" value={applicant.pan_number} />
            <InfoRow label="Aadhaar Number" value={applicant.aadhaar_number} />
            <InfoRow label="Monthly Income" value={applicant.monthly_income != null ? `Rs ${Number(applicant.monthly_income).toLocaleString()}` : null} />
            <InfoRow label="CIBIL Score" value={applicant.cibil_score != null ? `${applicant.cibil_score}` : "N/A"} />
            <InfoRow label="Loan Eligibility" value={applicant.cibil_score != null ? (Number(applicant.cibil_score) >= 650 ? "Eligible" : "Not Eligible") : "N/A"} />
            <InfoRow label="Employer" value={applicant.employer_name} />
            <InfoRow label="Employment Type" value={applicant.employment_type} />
            <InfoRow label="Loan Purpose" value={applicant.loan_purpose} />
            {applicant.loan_purpose === "Education Loan" && (
              <>
                <InfoRow label="Parent / Guardian Name" value={applicant.parent_name} />
                <InfoRow label="Parent Occupation" value={applicant.parent_occupation} />
                <InfoRow label="Parent Annual Income" value={applicant.parent_annual_income != null ? `Rs ${Number(applicant.parent_annual_income).toLocaleString()}` : null} />
              </>
            )}
          </Section>
        )}

        {Array.isArray(coapplicants) && coapplicants.length > 0 && (
          <Section title="Co-applicant Details">
            {coapplicants.map((party, index) => (
              <div key={party.coapplicant_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < coapplicants.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Co-applicant {index + 1}</div>
                <InfoRow label="Full Name" value={party.full_name} />
                <InfoRow label="Relationship" value={party.relationship} />
                <InfoRow label="Date of Birth" value={party.dob} />
                <InfoRow label="Mobile" value={party.primary_mobile} />
                <InfoRow label="Email" value={party.contact_email} />
                <InfoRow label="Address" value={[party.address_line1, party.address_line2, party.city, party.state, party.postal_code].filter(Boolean).join(", ")} />
                <InfoRow label="PAN Number" value={party.pan_number} />
                <InfoRow label="Aadhaar Number" value={party.aadhaar_number} />
                <InfoRow label="Monthly Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income).toLocaleString()}` : null} />
                <InfoRow label="Employer" value={party.employer_name} />
                <InfoRow label="Employment Type" value={party.employment_type} />
              </div>
            ))}
          </Section>
        )}

        {Array.isArray(guarantors) && guarantors.length > 0 && (
          <Section title="Guarantor Details">
            {guarantors.map((party, index) => (
              <div key={party.guarantor_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < guarantors.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Guarantor {index + 1}</div>
                <InfoRow label="Full Name" value={party.full_name} />
                <InfoRow label="Relationship" value={party.relationship} />
                <InfoRow label="Date of Birth" value={party.dob} />
                <InfoRow label="Mobile" value={party.primary_mobile} />
                <InfoRow label="Email" value={party.contact_email} />
                <InfoRow label="Address" value={[party.address_line1, party.address_line2, party.city, party.state, party.postal_code].filter(Boolean).join(", ")} />
                <InfoRow label="PAN Number" value={party.pan_number} />
                <InfoRow label="Aadhaar Number" value={party.aadhaar_number} />
                <InfoRow label="Monthly Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income).toLocaleString()}` : null} />
                <InfoRow label="Employer" value={party.employer_name} />
                <InfoRow label="Employment Type" value={party.employment_type} />
              </div>
            ))}
          </Section>
        )}

        <Section title="Contact Information">
          <InfoRow label="Contact Email" value={applicant?.contact_email} />
          <InfoRow label="Primary Mobile" value={applicant?.primary_mobile} />
          <InfoRow label="Alternate Mobile" value={applicant?.alternate_mobile} />
        </Section>

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
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Updated: {doc.updated_at ? new Date(doc.updated_at).toLocaleString() : "N/A"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        ...getDocumentBadgeStyle(doc.document_status),
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        minWidth: 120,
                        textAlign: "center",
                      }}
                    >
                      {doc.document_status_label || "Under Review"}
                    </span>
                    {(doc.document_status || "").toLowerCase() === "rejected" && (
                      <>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[doc.document_id] = el;
                          }}
                          type="file"
                          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => handleFileSelect(doc.document_id, e.target.files?.[0] || null)}
                          style={{ display: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleReuploadClick(doc)}
                          disabled={uploadingDocumentId === doc.document_id}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "1px solid rgba(59,130,246,0.3)",
                            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: uploadingDocumentId === doc.document_id ? "not-allowed" : "pointer",
                            opacity: uploadingDocumentId === doc.document_id ? 0.6 : 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {uploadingDocumentId === doc.document_id ? "Uploading..." : "Re-upload"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#64748b" }}>No documents uploaded.</div>
          )}
        </Section>
      </div>
    </div>
  );
}
