import { useEffect, useState } from "react";
import {
  fetchAdminLoanDetail,
  updateAdminLoanStatus,
  updateAdminDocumentStatus,
  sendAdminLoanEmail,
  sendAdminNotification,
  fetchLoanReportData,
  API_BASE_URL,
} from "../services/loanService";
import { monthDiff } from "../utils/loanUtils";
import Loader from "../components/ui/Loader";
import Section from "../components/ui/Section";
import InfoRow from "../components/ui/InfoRow";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { generateLoanPDF } from "../utils/pdfReport";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../auth/AuthContext";

export default function AdminLoanDetail({ navigate, loanId: loanIdProp, onBack }) {
  const displayId = loanIdProp;
  const toast = useToast();
  const { userEmail } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const loanId = loanIdProp;
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedReworkReasons, setSelectedReworkReasons] = useState([]);
  const [reworkDetails, setReworkDetails] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notifyingUser, setNotifyingUser] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [docActionLoadingId, setDocActionLoadingId] = useState(null);
  const [expandedDocumentId, setExpandedDocumentId] = useState(null);
  const [documentVerification, setDocumentVerification] = useState({});

  const getAdminEmail = () => {
    return (sessionStorage.getItem("adminEmail") || userEmail || "").trim();
  };

  const REWORK_REASON_OPTIONS = [
    { value: "missing_or_incomplete", label: "Missing or incomplete document" },
    { value: "blurred_or_unreadable", label: "Blurred or unreadable upload" },
    { value: "data_mismatch", label: "Applicant details mismatch" },
    { value: "expired_or_invalid", label: "Expired or invalid document" },
    { value: "signature_or_format_issue", label: "Signature / format issue" },
    { value: "other", label: "Other" },
  ];

  const getComposedAdminMessage = () => {
    const reasonLabels = REWORK_REASON_OPTIONS
      .filter((item) => selectedReworkReasons.includes(item.value))
      .map((item) => item.label);
    const details = reworkDetails.trim();
    const reasonText = reasonLabels.join(", ");

    if (reasonText && details) return `${reasonText}: ${details}`;
    if (reasonText) return reasonText;
    return details;
  };

  const validateReworkInput = () => {
    if (!selectedReworkReasons.length) {
      toast.warning("Please select at least one rework reason.");
      return false;
    }
    if (!reworkDetails.trim()) {
      toast.warning("Please enter details to notify the user.");
      return false;
    }
    return true;
  };

  const goToPage = (pageIndex) => {
    if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return;
    setCurrentPage(pageIndex);
  };

  const goNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, TOTAL_PAGES - 1));
  };

  const goPrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const loadLoanDetail = async ({ showGlobalLoader = false } = {}) => {
    if (!loanId) return;

    try {
      if (showGlobalLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const json = await fetchAdminLoanDetail(loanId);
      setData(json);
      setMessage("");
    } catch (err) {
      setMessage(err.message || "Failed to load loan details.");
      if (!showGlobalLoader) {
        toast.error(err.message || "Failed to refresh loan details.");
      }
    } finally {
      if (showGlobalLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (!loanId || refreshing || loading) return;
    await loadLoanDetail();
  };

  useEffect(() => {
    if (!loanId) {
      setLoading(false);
      setMessage("No loan selected.");
      return;
    }

    loadLoanDetail({ showGlobalLoader: true });
  }, [loanId]);

  useEffect(() => {
    const docs = data?.documents || [];
    if (!docs.length) {
      setDocumentVerification({});
      setExpandedDocumentId(null);
      return;
    }

    setDocumentVerification((prev) => {
      const next = {};
      docs.forEach((doc) => {
        const fromServer = {
          frontVerified: Boolean(doc.front_verified),
          backVerified: Boolean(doc.back_verified),
          isFullyVerified: Boolean(doc.is_fully_verified),
        };
        const existing = prev[doc.document_id];
        const merged = existing
          ? {
              frontVerified: Boolean(existing.frontVerified),
              backVerified: Boolean(existing.backVerified),
              isFullyVerified: Boolean(existing.isFullyVerified),
            }
          : fromServer;

        const bothChecked = merged.frontVerified && merged.backVerified;
        next[doc.document_id] = {
          frontVerified: merged.frontVerified,
          backVerified: merged.backVerified,
          isFullyVerified: merged.isFullyVerified || bothChecked,
        };
      });
      return next;
    });

    setExpandedDocumentId((prev) =>
      docs.some((doc) => doc.document_id === prev) ? prev : null
    );
  }, [data?.documents]);

  const handleDownloadPDF = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const reportData = await fetchLoanReportData(loanId, "", "admin");
      generateLoanPDF(reportData);
      toast.success("PDF report downloaded!");
    } catch (err) {
      toast.error(err.message || "Failed to generate report.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!loanId || sendingEmail) return;
    try {
      setSendingEmail(true);
      const adminEmail = getAdminEmail();
      if (!adminEmail) {
        toast.error("Admin session email missing. Please login again.");
        return;
      }
      const json = await sendAdminLoanEmail(loanId, adminEmail, getComposedAdminMessage());
      toast.success(json.message || "Email sent successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleNotifyUser = async () => {
    if (!loanId || notifyingUser) return;
    if (!validateReworkInput()) {
      return;
    }

    const composedMessage = getComposedAdminMessage();
    try {
      setNotifyingUser(true);
      const adminEmail = getAdminEmail();
      if (!adminEmail) {
        toast.error("Admin session email missing. Please login again.");
        return;
      }
      const json = await sendAdminNotification(loanId, composedMessage, adminEmail);
      toast.success(json.message || "Notification sent to user.");
    } catch (err) {
      toast.error(err.message || "Failed to notify user.");
    } finally {
      setNotifyingUser(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!loanId || actionLoading) return;
    if (newStatus === "Rework" && !validateReworkInput()) return;

    try {
      setActionLoading(true);
      setMessage("");
      const adminEmail = getAdminEmail();
      if (!adminEmail) {
        toast.error("Admin session email missing. Please login again.");
        return;
      }
      const json = await updateAdminLoanStatus(
        loanId,
        newStatus,
        adminEmail,
        getComposedAdminMessage()
      );
      toast.success(json.message || `Loan ${newStatus.toLowerCase()}.`);
      setMessage(json.message || `Loan ${newStatus.toLowerCase()}.`);
      setData((prev) =>
        prev ? { ...prev, loan: { ...prev.loan, status: newStatus } } : null
      );
      setSelectedReworkReasons([]);
      setReworkDetails("");
    } catch (err) {
      setMessage(err.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
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
        background: "#ffedd5",
        color: "#9a3412",
        border: "1px solid rgba(234,88,12,0.2)",
      };
    }
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid rgba(146,64,14,0.2)",
    };
  };

  const handleDocumentDecision = async (doc, nextStatus) => {
    const documentId = doc?.document_id;
    if (!documentId) return;
    if (docActionLoadingId) return;

    if (nextStatus === "rejected" && !validateReworkInput()) return;

    const verification = documentVerification[documentId] || {
      frontVerified: false,
      backVerified: false,
      isFullyVerified: false,
    };

    const fullyVerified =
      Boolean(verification.isFullyVerified) ||
      (Boolean(verification.frontVerified) && Boolean(verification.backVerified));

    try {
      setDocActionLoadingId(documentId);
      const adminEmail = getAdminEmail();
      if (!adminEmail) {
        toast.error("Admin session email missing. Please login again.");
        return;
      }
      const json = await updateAdminDocumentStatus(
        documentId,
        nextStatus,
        adminEmail,
        getComposedAdminMessage(),
        {
          front_verified:
            nextStatus === "accepted"
              ? true
              : Boolean(verification.frontVerified),
          back_verified:
            nextStatus === "accepted"
              ? true
              : Boolean(verification.backVerified),
          is_fully_verified:
            nextStatus === "accepted"
              ? true
              : Boolean(verification.isFullyVerified),
        }
      );

      setData((prev) => {
        if (!prev?.documents) return prev;
        return {
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.document_id === documentId
              ? {
                  ...doc,
                  document_status: json?.document?.document_status || nextStatus,
                  document_status_label:
                    json?.document?.document_status_label ||
                    (nextStatus === "accepted" ? "Accepted" : "Rework"),
                  document_status_color: json?.document?.document_status_color ||
                    (nextStatus === "accepted" ? "green" : "red"),
                  updated_at: json?.document?.updated_at || new Date().toISOString(),
                  front_verified:
                    json?.document?.front_verified ??
                    (nextStatus === "accepted"
                      ? true
                      : Boolean(verification.frontVerified)),
                  back_verified:
                    json?.document?.back_verified ??
                    (nextStatus === "accepted"
                      ? true
                      : Boolean(verification.backVerified)),
                  is_fully_verified:
                    json?.document?.is_fully_verified ??
                    (nextStatus === "accepted"
                      ? true
                      : Boolean(verification.isFullyVerified)),
                }
              : doc
          ),
        };
      });

      setDocumentVerification((prev) => ({
        ...prev,
        [documentId]: {
          frontVerified:
            json?.document?.front_verified ??
            (nextStatus === "accepted"
              ? true
              : Boolean(verification.frontVerified)),
          backVerified:
            json?.document?.back_verified ??
            (nextStatus === "accepted"
              ? true
              : Boolean(verification.backVerified)),
          isFullyVerified:
            json?.document?.is_fully_verified ??
            (nextStatus === "accepted"
              ? true
              : Boolean(verification.isFullyVerified)),
        },
      }));

      toast.success(
        json?.message ||
          `Document marked as ${nextStatus === "accepted" ? "Accepted" : "Rework"}.`
      );
    } catch (err) {
      toast.error(err.message || "Failed to update document status.");
    } finally {
      setDocActionLoadingId(null);
    }
  };

  const currentStatus = data?.loan?.status?.toLowerCase() || "";
  const isPending = currentStatus === "pending" || currentStatus === "under review";

  if (loading) {
    return (
      <div
        className="page-bg-image loan-app-bg loan-details-bg"
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0) 55%), linear-gradient(160deg, #eff6ff 0%, #e0e7ff 45%, #f1f5f9 100%)",
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
        className="page-bg-image loan-app-bg loan-details-bg"
        style={{
          minHeight: "100vh",
          padding: 22,
          background:
            "radial-gradient(900px 600px at 18% 10%, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0) 55%), linear-gradient(160deg, #eff6ff 0%, #e0e7ff 45%, #f1f5f9 100%)",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            width: "min(1120px, 96vw)",
            margin: "0 auto",
            background: "rgba(238,243,252,0.84)",
            border: "1px solid rgba(255,255,255,0.74)",
            boxShadow: "0 20px 58px rgba(15, 23, 42, 0.08)",
            borderRadius: 20,
            padding: 24,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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

  const { loan, applicant, documents, coapplicants, guarantors } = data || {};
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

  const TOTAL_PAGES = 11;

  const normalizeDocumentType = (doc) => (doc?.document_type || "").toLowerCase();
  const normalizeDocumentStatus = (doc) => (doc?.document_status || "under_review").toLowerCase();

  const isKycDocument = (doc) => {
    const type = normalizeDocumentType(doc);
    return type.includes("aadhaar") || type.includes("pan");
  };

  const isIncomeDocument = (doc) => {
    const type = normalizeDocumentType(doc);
    return (
      type.includes("income") ||
      type.includes("salary") ||
      type.includes("bank statement") ||
      type.includes("pay slip") ||
      type.includes("payslip") ||
      type.includes("tax") ||
      type.includes("itr")
    );
  };

  const isCoApplicantDocument = (doc) => {
    const type = normalizeDocumentType(doc);
    return type.includes("co-applicant") || type.includes("co applicant");
  };

  const isGuarantorDocument = (doc) => normalizeDocumentType(doc).includes("guarantor");

  const isAdditionalDocument = (doc) =>
    !isKycDocument(doc) && !isIncomeDocument(doc) && !isCoApplicantDocument(doc) && !isGuarantorDocument(doc);

  const isPrimaryApplicantDocument = (doc) =>
    !isCoApplicantDocument(doc) && !isGuarantorDocument(doc);

  const kycDocs = (documents || []).filter(
    (doc) => isPrimaryApplicantDocument(doc) && isKycDocument(doc)
  );
  const incomeDocs = (documents || []).filter(
    (doc) => isPrimaryApplicantDocument(doc) && isIncomeDocument(doc)
  );
  const additionalDocs = (documents || []).filter(isAdditionalDocument);
  const coApplicantDocs = (documents || []).filter(isCoApplicantDocument);
  const guarantorDocs = (documents || []).filter(isGuarantorDocument);
  const coApplicantKycDocs = coApplicantDocs.filter(isKycDocument);
  const coApplicantIncomeDocs = coApplicantDocs.filter(isIncomeDocument);
  const guarantorKycDocs = guarantorDocs.filter(isKycDocument);
  const guarantorIncomeDocs = guarantorDocs.filter(isIncomeDocument);
  const acceptedDocs = (documents || []).filter((doc) => normalizeDocumentStatus(doc) === "accepted");
  const rejectedDocs = (documents || []).filter((doc) => normalizeDocumentStatus(doc) === "rejected");
  const underReviewDocs = (documents || []).filter(
    (doc) => !["accepted", "rejected"].includes(normalizeDocumentStatus(doc))
  );
  const totalDocsCount = (documents || []).length;
  const canAcceptLoan = totalDocsCount > 0 && acceptedDocs.length === totalDocsCount;

  const getDocumentStatusLabel = (doc) => {
    const normalized = normalizeDocumentStatus(doc);
    if (normalized === "rejected") return "Rework";
    if (normalized === "accepted") return "Accepted";
    return doc?.document_status_label || "Under Review";
  };

  const getDocumentPreviewUrl = (doc) => {
    if (!doc?.document_id) return "";
    const stamp = doc?.updated_at ? `?t=${encodeURIComponent(doc.updated_at)}` : "";
    return `${API_BASE_URL}/api/admin/document/${doc.document_id}${stamp}`;
  };

  const getDocumentFileType = (doc) => {
    const rawName =
      (doc?.original_filename || doc?.stored_filename || doc?.file_path || "").toLowerCase();
    if (!rawName) return "unknown";
    if (rawName.endsWith(".pdf")) return "pdf";
    if (rawName.endsWith(".png") || rawName.endsWith(".jpg") || rawName.endsWith(".jpeg") || rawName.endsWith(".webp")) {
      return "image";
    }
    return "unknown";
  };

  const getDocumentStatusDotStyle = (status) => {
    const normalized = (status || "under_review").toLowerCase();
    if (normalized === "accepted") {
      return {
        background: "#16a34a",
        border: "2px solid rgba(22,163,74,0.35)",
      };
    }
    if (normalized === "rejected") {
      return {
        background: "#dc2626",
        border: "2px solid rgba(220,38,38,0.35)",
      };
    }
    return {
      background: "#d97706",
      border: "2px solid rgba(217,119,6,0.35)",
    };
  };

  const getSectionStatusMeta = (docs) => {
    const normalized = Array.from(
      new Set(docs.map((doc) => normalizeDocumentStatus(doc)))
    );

    if (normalized.length === 1) {
      const key = normalized[0];
      if (key === "accepted") {
        return {
          label: "Accepted",
          style: getDocumentBadgeStyle("accepted"),
        };
      }
      if (key === "rejected") {
        return {
          label: "Rework",
          style: getDocumentBadgeStyle("rejected"),
        };
      }
      return {
        label: "Under Review",
        style: getDocumentBadgeStyle("under_review"),
      };
    }

    return {
      label: "Mixed",
      style: {
        background: "#e2e8f0",
        color: "#334155",
        border: "1px solid rgba(51,65,85,0.2)",
      },
    };
  };

  const renderDocumentCards = (docs, emptyText, options = {}) => {
    const showSectionControls = Boolean(options.showSectionControls);

    if (!docs.length) {
      return <div style={{ color: "#64748b" }}>{emptyText}</div>;
    }

    const sectionStatusMeta = showSectionControls ? getSectionStatusMeta(docs) : null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {showSectionControls && sectionStatusMeta && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(148,163,184,0.22)",
              borderRadius: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
                Doc Status
              </span>
              <span
                style={{
                  ...sectionStatusMeta.style,
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {sectionStatusMeta.label}
              </span>
            </div>
          </div>
        )}

        {docs.map((doc) => {
          const isLocked = ["accepted", "rejected"].includes(
            (doc.document_status || "").toLowerCase()
          );

          const previewUrl = getDocumentPreviewUrl(doc);
          const previewType = getDocumentFileType(doc);

          return (
            <div
              key={doc.document_id}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px",
                background: "rgba(255,255,255,0.88)",
                borderRadius: 14,
                gap: 12,
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 6px 18px rgba(15,23,42,0.05)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#1e293b",
                    textAlign: "left",
                    fontSize: 14,
                    marginTop: 3,
                  }}
                >
                  {doc.document_type}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {!isLocked && (
                    <>
                      <Button
                        variant="primary"
                        disabled={docActionLoadingId === doc.document_id}
                        onClick={() => handleDocumentDecision(doc, "accepted")}
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          border: "1px solid rgba(134,239,172,0.7)",
                          color: "#166534",
                          boxShadow: "0 3px 8px rgba(15,23,42,0.08)",
                          width: 30,
                          height: 30,
                          minWidth: 30,
                          padding: 0,
                          borderRadius: 8,
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        {docActionLoadingId === doc.document_id ? "..." : "✓"}
                      </Button>
                      <Button
                        variant="primary"
                        disabled={docActionLoadingId === doc.document_id}
                        onClick={() => handleDocumentDecision(doc, "rejected")}
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          border: "1px solid rgba(252,165,165,0.7)",
                          color: "#991b1b",
                          boxShadow: "0 3px 8px rgba(15,23,42,0.08)",
                          width: 30,
                          height: 30,
                          minWidth: 30,
                          padding: 0,
                          borderRadius: 8,
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        {docActionLoadingId === doc.document_id ? "..." : "✕"}
                      </Button>
                    </>
                  )}
                  <span
                    title={getDocumentStatusLabel(doc)}
                    aria-label={getDocumentStatusLabel(doc)}
                    style={{
                      ...getDocumentStatusDotStyle(doc.document_status),
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      display: "inline-block",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDocumentId((prev) =>
                        prev === doc.document_id ? null : doc.document_id
                      )
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={expandedDocumentId === doc.document_id ? "Collapse document" : "Expand document"}
                  >
                    {expandedDocumentId === doc.document_id ? "-" : "+"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxHeight: expandedDocumentId === doc.document_id ? 1200 : 0,
                  overflow: "hidden",
                  opacity: expandedDocumentId === doc.document_id ? 1 : 0,
                  transition: "max-height 0.28s ease, opacity 0.22s ease",
                  borderTop:
                    expandedDocumentId === doc.document_id
                      ? "1px solid rgba(15,23,42,0.08)"
                      : "1px solid transparent",
                  paddingTop: expandedDocumentId === doc.document_id ? 12 : 0,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  {doc.original_filename || "No filename"}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
                  Updated: {doc.updated_at ? new Date(doc.updated_at).toLocaleString() : "N/A"}
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid rgba(148,163,184,0.22)",
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
                  {previewType === "image" && (
                    <img
                      src={previewUrl}
                      alt={doc.document_type || "Uploaded document"}
                      style={{
                        width: "100%",
                        maxHeight: 240,
                        objectFit: "contain",
                        borderRadius: 10,
                        display: "block",
                        background: "#fff",
                      }}
                    />
                  )}

                  {previewType === "pdf" && (
                    <iframe
                      src={previewUrl}
                      title={doc.document_type || "Uploaded document"}
                      style={{
                        width: "100%",
                        height: 240,
                        border: "none",
                        borderRadius: 10,
                        background: "#fff",
                      }}
                    />
                  )}

                  {previewType === "unknown" && (
                    <div style={{ color: "#64748b", fontSize: 12, padding: "10px 6px" }}>
                      Preview not available for this file type.
                    </div>
                  )}

                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#ea580c",
                      textDecoration: "none",
                    }}
                  >
                    Open Full Document
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const toggleReworkReason = (reasonValue) => {
    setSelectedReworkReasons((prev) =>
      prev.includes(reasonValue)
        ? prev.filter((value) => value !== reasonValue)
        : [...prev, reasonValue]
    );
  };

  const steps = [
    { id: 1, title: "Applicant: Personal & Loan" },
    { id: 2, title: "Applicant KYC Documents" },
    { id: 3, title: "Income Details & Documents" },
    { id: 4, title: "Additional Documents" },
    { id: 5, title: "Co-applicant Details" },
    { id: 6, title: "Co-applicant KYC Documents" },
    { id: 7, title: "Co-applicant Income Details & Documents" },
    { id: 8, title: "Guarantor Details" },
    { id: 9, title: "Guarantor KYC Documents" },
    { id: 10, title: "Guarantor Income Details & Documents" },
    { id: 11, title: "Final Summary" },
  ];

  return (
    <div
      className="page-bg-image loan-app-bg loan-details-bg"
      style={{
        minHeight: "100dvh",
        width: "100%",
        padding: "40px 20px",
        boxSizing: "border-box",
        background: "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1220,
          background: "rgba(238,243,252,0.84)",
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow: "0 20px 58px rgba(15, 23, 42, 0.08)",
          borderRadius: 20,
          padding: "32px clamp(14px, 4vw, 40px)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, color: "#ea580c", letterSpacing: "-0.3px" }}>
              Loan Review
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 8, maxWidth: 520, lineHeight: 1.5 }}>
              Review all 10 sections in sequence for applicant, co-applicant, guarantor, and final decision.
            </div>
          </div>
        </div>

        {message && (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(220,38,38,0.08)", color: "#dc2626", marginBottom: 20, fontWeight: 700 }}>
            {message}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <span
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 11,
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
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(249,115,22,0.25)",
            }}
          >
            {downloading ? "Generating..." : "📄 PDF"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              width: "auto",
              padding: "10px 18px",
              background: "rgba(255,255,255,0.95)",
              color: "#ea580c",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              opacity: refreshing || loading ? 0.7 : 1,
            }}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button
            style={{
              width: "auto",
              padding: "10px 18px",
              background: "rgba(255,255,255,0.95)",
              color: "#ea580c",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
            onClick={onBack}
          >
            ← Back
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginTop: "-8px" }}>
        {/* Sidebar Navigation */}
        <aside
          style={{
            flex: "0 0 250px",
            width: "250px",
            maxWidth: "100%",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "29px" }}>
            {steps.map((step, index) => {
              const isActive = currentPage === index;
              const isComplete = index < currentPage;
              return (
                <button
                  key={step.id}
                  onClick={() => goToPage(index)}
                  style={{
                    borderRadius: "12px",
                    border: isActive ? "1px solid #4338ca" : "1px solid #cbd5e1",
                    background: isComplete ? "#e0e7ff" : isActive ? "#eef2ff" : "#f8fafc",
                    color: isActive ? "#312e81" : "#475569",
                    padding: "10px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {step.id}. {step.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div
          style={{
            flex: "1 1 620px",
            minWidth: 0,
            maxWidth: 920,
          }}
        >
        {/* Content Pages */}
        <div style={{ minHeight: "400px", marginBottom: 20 }}>
          {currentPage === 0 && (
            <>
              <Section title="Personal Information" variant="orange">
                <InfoRow label="Full Name" value={applicant?.full_name} />
                <InfoRow label="Date of Birth" value={applicant?.dob} />
                <InfoRow label="Email" value={applicant?.contact_email} />
                <InfoRow label="Primary Mobile" value={applicant?.primary_mobile} />
                <InfoRow label="Alternate Mobile" value={applicant?.alternate_mobile} />
                <InfoRow label="Address Line 1" value={applicant?.address_line1} />
                <InfoRow label="Address Line 2" value={applicant?.address_line2} />
                <InfoRow label="City" value={applicant?.city} />
                <InfoRow label="State" value={applicant?.state} />
                <InfoRow label="Postal Code" value={applicant?.postal_code} />
              </Section>

              <Section title="Loan Details" variant="orange">
                <InfoRow label="Loan Amount" value={`Rs ${amount.toLocaleString()}`} />
                <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
                <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
                <InfoRow label="EMI" value={`Rs ${Number(loan?.emi || 0).toFixed(2)}`} />
                <InfoRow label="Applied Date" value={loan?.applied_date ? new Date(loan.applied_date).toLocaleString() : null} />
                <InfoRow label="Loan Purpose" value={applicant?.loan_purpose} />
              </Section>
            </>
          )}

          {currentPage === 1 && (
            <>
              <Section title="Applicant KYC Information" variant="orange">
                <InfoRow label="PAN Number" value={applicant?.pan_number} />
                <InfoRow label="Aadhaar Number" value={applicant?.aadhaar_number} />
                <InfoRow label="CIBIL Score" value={applicant?.cibil_score != null ? `${applicant.cibil_score} (${Number(applicant.cibil_score) >= 650 ? "Eligible" : "Not Eligible"})` : "N/A"} />
              </Section>

              <Section title="Aadhaar Documents" variant="orange">
                {renderDocumentCards(
                  kycDocs.filter((doc) => normalizeDocumentType(doc).includes("aadhaar")),
                  "No Aadhaar documents found.",
                  { showSectionControls: true }
                )}
              </Section>

              <Section title="PAN Documents" variant="orange">
                {renderDocumentCards(
                  kycDocs.filter((doc) => normalizeDocumentType(doc).includes("pan")),
                  "No PAN documents found.",
                  { showSectionControls: true }
                )}
              </Section>
            </>
          )}

          {currentPage === 2 && (
            <>
              <Section title="Income Details" variant="orange">
                <InfoRow label="Monthly Income" value={applicant?.monthly_income != null ? `Rs ${Number(applicant.monthly_income).toLocaleString()}` : null} />
                <InfoRow label="Employer Name" value={applicant?.employer_name} />
                <InfoRow label="Employment Type" value={applicant?.employment_type} />
                <InfoRow label="Loan Purpose" value={applicant?.loan_purpose} />
              </Section>

              <Section title="Income Documents" variant="orange">
                {renderDocumentCards(incomeDocs, "No income documents found.", { showSectionControls: true })}
              </Section>
            </>
          )}

          {currentPage === 3 && (
            <>
              <Section title="Additional Information" variant="orange">
                <InfoRow label="Parent / Guardian Name" value={applicant?.parent_name} />
                <InfoRow label="Parent Occupation" value={applicant?.parent_occupation} />
                <InfoRow label="Parent Annual Income" value={applicant?.parent_annual_income != null ? `Rs ${Number(applicant.parent_annual_income).toLocaleString()}` : null} />
              </Section>

              <Section title="Additional Documents" variant="orange">
                {renderDocumentCards(additionalDocs, "No additional documents found.", { showSectionControls: true })}
              </Section>
            </>
          )}

          {currentPage === 4 && (
            <>
              <Section title="Co-applicant Details" variant="orange">
                {Array.isArray(coapplicants) && coapplicants.length > 0 ? (
                  coapplicants.map((party, index) => (
                    <div key={party.coapplicant_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < coapplicants.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                      <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Co-applicant {index + 1}</div>
                      <InfoRow label="Co-applicant Name" value={party.full_name || "N/A"} />
                      <InfoRow label="Relationship" value={party.relationship || "N/A"} />
                      <InfoRow label="Mobile" value={party.primary_mobile || "N/A"} />
                      <InfoRow label="Annual Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income * 12).toLocaleString()}` : "N/A"} />
                      <InfoRow label="PAN Number" value={party.pan_number || "N/A"} />
                      <InfoRow label="Aadhaar Number" value={party.aadhaar_number || "N/A"} />
                      <InfoRow label="Employer" value={party.employer_name || "N/A"} />
                      <InfoRow label="Employment Type" value={party.employment_type || "N/A"} />
                      <InfoRow label="Address" value={[party.address_line1, party.address_line2, party.city, party.state, party.postal_code].filter(Boolean).join(", ") || "N/A"} />
                    </div>
                  ))
                ) : (
                  <>
                    <InfoRow label="Co-applicant Name" value={applicant?.coapplicant_name || applicant?.co_applicant_name || "N/A"} />
                    <InfoRow label="Relationship" value={applicant?.coapplicant_relationship || applicant?.co_applicant_relationship || "N/A"} />
                    <InfoRow label="Mobile" value={applicant?.coapplicant_mobile || applicant?.co_applicant_mobile || "N/A"} />
                    <InfoRow label="Annual Income" value={applicant?.coapplicant_annual_income != null ? `Rs ${Number(applicant.coapplicant_annual_income).toLocaleString()}` : applicant?.co_applicant_annual_income != null ? `Rs ${Number(applicant.co_applicant_annual_income).toLocaleString()}` : "N/A"} />
                    <InfoRow label="PAN Number" value={applicant?.coapplicant_pan_number || applicant?.co_applicant_pan_number || "N/A"} />
                    <InfoRow label="Aadhaar Number" value={applicant?.coapplicant_aadhaar_number || applicant?.co_applicant_aadhaar_number || "N/A"} />
                  </>
                )}
              </Section>
            </>
          )}

          {currentPage === 5 && (
            <>
              <Section title="Co-applicant KYC Documents" variant="orange">
                {renderDocumentCards(
                  coApplicantKycDocs,
                  "No co-applicant KYC documents found.",
                  { showSectionControls: true }
                )}
              </Section>
            </>
          )}

          {currentPage === 6 && (
            <>
              <Section title="Co-applicant Income Details" variant="orange">
                {Array.isArray(coapplicants) && coapplicants.length > 0 ? (
                  coapplicants.map((party, index) => (
                    <div key={party.coapplicant_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < coapplicants.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                      <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Co-applicant {index + 1}</div>
                      <InfoRow label="Monthly Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income).toLocaleString()}` : "N/A"} />
                      <InfoRow label="Annual Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income * 12).toLocaleString()}` : "N/A"} />
                      <InfoRow label="Employer" value={party.employer_name || "N/A"} />
                      <InfoRow label="Employment Type" value={party.employment_type || "N/A"} />
                    </div>
                  ))
                ) : (
                  <>
                    <InfoRow label="Annual Income" value={applicant?.coapplicant_annual_income != null ? `Rs ${Number(applicant.coapplicant_annual_income).toLocaleString()}` : applicant?.co_applicant_annual_income != null ? `Rs ${Number(applicant.co_applicant_annual_income).toLocaleString()}` : "N/A"} />
                    <InfoRow label="Employer" value={applicant?.coapplicant_employer_name || applicant?.co_applicant_employer_name || "N/A"} />
                    <InfoRow label="Employment Type" value={applicant?.coapplicant_employment_type || applicant?.co_applicant_employment_type || "N/A"} />
                  </>
                )}
              </Section>

              <Section title="Co-applicant Income Documents" variant="orange">
                {renderDocumentCards(
                  coApplicantIncomeDocs,
                  "No co-applicant income documents found.",
                  { showSectionControls: true }
                )}
              </Section>
            </>
          )}

          {currentPage === 7 && (
            <>
              <Section title="Guarantor Details" variant="orange">
                {Array.isArray(guarantors) && guarantors.length > 0 ? (
                  guarantors.map((party, index) => (
                    <div key={party.guarantor_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < guarantors.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                      <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Guarantor {index + 1}</div>
                      <InfoRow label="Guarantor Name" value={party.full_name || "N/A"} />
                      <InfoRow label="Relationship" value={party.relationship || "N/A"} />
                      <InfoRow label="Mobile" value={party.primary_mobile || "N/A"} />
                      <InfoRow label="Annual Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income * 12).toLocaleString()}` : "N/A"} />
                      <InfoRow label="PAN Number" value={party.pan_number || "N/A"} />
                      <InfoRow label="Aadhaar Number" value={party.aadhaar_number || "N/A"} />
                      <InfoRow label="Employer" value={party.employer_name || "N/A"} />
                      <InfoRow label="Employment Type" value={party.employment_type || "N/A"} />
                      <InfoRow label="Address" value={[party.address_line1, party.address_line2, party.city, party.state, party.postal_code].filter(Boolean).join(", ") || "N/A"} />
                    </div>
                  ))
                ) : (
                  <>
                    <InfoRow label="Guarantor Name" value={applicant?.guarantor_name || applicant?.guarantor_full_name || "N/A"} />
                    <InfoRow label="Relationship" value={applicant?.guarantor_relationship || "N/A"} />
                    <InfoRow label="Mobile" value={applicant?.guarantor_mobile || "N/A"} />
                    <InfoRow label="Annual Income" value={applicant?.guarantor_annual_income != null ? `Rs ${Number(applicant.guarantor_annual_income).toLocaleString()}` : "N/A"} />
                    <InfoRow label="PAN Number" value={applicant?.guarantor_pan_number || "N/A"} />
                    <InfoRow label="Aadhaar Number" value={applicant?.guarantor_aadhaar_number || "N/A"} />
                  </>
                )}
              </Section>
            </>
          )}

          {currentPage === 8 && (
            <>
              <Section title="Guarantor KYC Documents" variant="orange">
                {renderDocumentCards(
                  guarantorKycDocs,
                  "No guarantor KYC documents found.",
                  { showSectionControls: true }
                )}
              </Section>
            </>
          )}

          {currentPage === 9 && (
            <>
              <Section title="Guarantor Income Details" variant="orange">
                {Array.isArray(guarantors) && guarantors.length > 0 ? (
                  guarantors.map((party, index) => (
                    <div key={party.guarantor_id || index} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: index < guarantors.length - 1 ? "1px solid rgba(15,23,42,0.08)" : "none" }}>
                      <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 10 }}>Guarantor {index + 1}</div>
                      <InfoRow label="Monthly Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income).toLocaleString()}` : "N/A"} />
                      <InfoRow label="Annual Income" value={party.monthly_income != null ? `Rs ${Number(party.monthly_income * 12).toLocaleString()}` : "N/A"} />
                      <InfoRow label="Employer" value={party.employer_name || "N/A"} />
                      <InfoRow label="Employment Type" value={party.employment_type || "N/A"} />
                    </div>
                  ))
                ) : (
                  <>
                    <InfoRow label="Annual Income" value={applicant?.guarantor_annual_income != null ? `Rs ${Number(applicant.guarantor_annual_income).toLocaleString()}` : "N/A"} />
                    <InfoRow label="Employer" value={applicant?.guarantor_employer_name || "N/A"} />
                    <InfoRow label="Employment Type" value={applicant?.guarantor_employment_type || "N/A"} />
                  </>
                )}
              </Section>

              <Section title="Guarantor Income Details & Documents" variant="orange">
                {renderDocumentCards(
                  guarantorIncomeDocs,
                  "No guarantor income documents found.",
                  { showSectionControls: true }
                )}
              </Section>
            </>
          )}

          {currentPage === 10 && (
            <>
              <Section title="Final Summary" variant="orange">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div style={{ padding: 14, borderRadius: 12, background: "#ecfdf3", border: "1px solid rgba(22,163,74,0.2)" }}>
                    <div style={{ fontSize: 12, color: "#166534", fontWeight: 800, marginBottom: 8 }}>Accepted Documents</div>
                    {acceptedDocs.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {acceptedDocs.map((doc) => (
                          <div key={`accepted-${doc.document_id}`} style={{ fontSize: 12, color: "#14532d", fontWeight: 600 }}>
                            • {doc.document_type}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#64748b" }}>No accepted documents yet.</div>
                    )}
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: "#fef2f2", border: "1px solid rgba(220,38,38,0.2)" }}>
                    <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 800, marginBottom: 8 }}>Rework Documents</div>
                    {rejectedDocs.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {rejectedDocs.map((doc) => (
                          <div key={`rework-${doc.document_id}`} style={{ fontSize: 12, color: "#7f1d1d", fontWeight: 600 }}>
                            • {doc.document_type}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#64748b" }}>No rework documents.</div>
                    )}
                  </div>
                </div>

                {underReviewDocs.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#92400e", fontWeight: 700 }}>
                    Under Review: {underReviewDocs.length}
                  </div>
                )}
              </Section>

              <Section title="Loan Final Decision" variant="orange">
                {!isPending && (
                  <div style={{ marginBottom: 20, color: "#64748b", fontSize: 14, padding: 14, background: "rgba(249,115,22,0.06)", borderRadius: 10 }}>
                    This loan has already been {loan?.status?.toLowerCase()}.
                  </div>
                )}

                <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>
                      Rework Reasons *
                    </label>
                    <div
                      style={{
                        border: "1px solid rgba(148,163,184,0.3)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.75)",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      {REWORK_REASON_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 500 }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReworkReasons.includes(option.value)}
                            onChange={() => toggleReworkReason(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>
                      Rework Details *
                    </label>
                    <input
                      className="input-field"
                      value={reworkDetails}
                      onChange={(e) => setReworkDetails(e.target.value)}
                      placeholder="Enter issue details for user notification"
                      maxLength={2000}
                      required
                    />
                  </div>
                </div>

                {isPending && (
                  <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10 }}>
                    <Button
                      variant="primary"
                      onClick={() => setConfirmAction("Approved")}
                      disabled={actionLoading || !canAcceptLoan}
                      style={{
                        background: "rgba(255,255,255,0.78)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(134,239,172,0.7)",
                        color: "#166534",
                        boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
                        padding: "8px 12px",
                        fontWeight: 700,
                        opacity: actionLoading || !canAcceptLoan ? 0.55 : 1,
                        cursor: actionLoading || !canAcceptLoan ? "not-allowed" : "pointer",
                      }}
                    >
                      {actionLoading ? "Processing..." : "✓ Accept"}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setConfirmAction("Rejected")}
                      disabled={actionLoading}
                      style={{
                        background: "rgba(255,255,255,0.78)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(252,165,165,0.7)",
                        color: "#991b1b",
                        boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
                        padding: "8px 12px",
                        fontWeight: 700,
                      }}
                    >
                      {actionLoading ? "Processing..." : "✕ Reject "}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setConfirmAction("Rework")}
                      disabled={actionLoading}
                      style={{
                        background: "rgba(255,255,255,0.78)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(147,197,253,0.85)",
                        color: "#2563eb",
                        boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
                        padding: "8px 12px",
                        fontWeight: 700,
                      }}
                    >
                      {actionLoading ? <span style={{ color: "#2563eb" }}>Processing...</span> : <span style={{ color: "#2563eb" }}>⟳ Rework</span>}
                    </Button>
                  </div>
                )}

                {isPending && !canAcceptLoan && (
                  <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                    Accept Loan is enabled only when all documents are accepted.
                    {rejectedDocs.length > 0 ? ` Rework documents: ${rejectedDocs.length}.` : ""}
                    {underReviewDocs.length > 0 ? ` Under review documents: ${underReviewDocs.length}.` : ""}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  <Button variant="secondary" onClick={handleSendEmail} disabled={sendingEmail} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
                    {sendingEmail ? "Sending..." : "📧 Send Email"}
                  </Button>
                  <Button variant="secondary" onClick={handleNotifyUser} disabled={notifyingUser} style={{ borderColor: "#fed7aa", color: "#ea580c" }}>
                    {notifyingUser ? "Sending..." : "🔔 Notify User"}
                  </Button>
                </div>
              </Section>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 20, alignItems: "center" }}>
          <Button
            variant="secondary"
            onClick={goPrevious}
            disabled={currentPage === 0}
            style={{
              opacity: currentPage === 0 ? 0.5 : 1,
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
              minWidth: 120,
              color: "#ea580c",
              borderColor: "#fed7aa",
            }}
          >
            ← Previous
          </Button>
          <div style={{ fontSize: 12, color: "#64748b", alignSelf: "center", fontWeight: 600 }}>
            Step {currentPage + 1} of {TOTAL_PAGES}
          </div>
          <Button
            variant="primary"
            onClick={goNext}
            disabled={currentPage === TOTAL_PAGES - 1}
            style={{
              opacity: currentPage === TOTAL_PAGES - 1 ? 0.5 : 1,
              cursor: currentPage === TOTAL_PAGES - 1 ? "not-allowed" : "pointer",
              background: currentPage === TOTAL_PAGES - 1 ? "rgba(200, 200, 200, 0.3)" : "linear-gradient(135deg, #f97316, #ea580c)",
              minWidth: 120,
            }}
          >
            Next →
          </Button>
        </div>

        </div>

        </div>

        {/* Confirmation Modal */}
        <Modal
          open={!!confirmAction}
          title={`Confirm ${confirmAction === "Approved" ? "Approval" : confirmAction === "Rework" ? "Rework Request" : "Rejection"}`}
          onClose={() => setConfirmAction(null)}
        >
          <p style={{ color: "#475569", marginBottom: 20 }}>
            {confirmAction === "Approved"
              ? `Are you sure you want to approve Loan #${displayId}?`
              : confirmAction === "Rework"
                ? `Are you sure you want to send Loan #${displayId} back for rework? The applicant will need to update documents.`
                : `Are you sure you want to reject Loan #${displayId}? This action cannot be undone.`}
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
                background:
                  confirmAction === "Approved"
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : confirmAction === "Rework"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
              }}
            >
              {confirmAction === "Approved" ? "✓ Approve" : confirmAction === "Rework" ? "⟳ Send for Rework" : "✕ Reject"}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
