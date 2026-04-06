import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { submitLoanApplication, fetchUserLoanDetail, fetchUserLoans } from "../services/loanService";
import {
  LOAN_PURPOSES,
  EMPLOYMENT_TYPES,
  TENURE_OPTIONS,
  COAPPLICANT_RELATIONSHIP_OPTIONS,
  GUARANTOR_RELATIONSHIP_OPTIONS,
} from "../constants";
import { isValidPAN, isValidAadhaar } from "../utils/validators";
import useLoanForm from "../hooks/useLoanForm";
import Modal from "../components/ui/Modal";
import { calculateCibilFromLoanHistory } from "../utils/loanUtils";

const APPLICANT_AADHAAR_FRONT_LABEL = "Applicant Aadhaar Front";
const APPLICANT_AADHAAR_BACK_LABEL = "Applicant Aadhaar Back";
const APPLICANT_PAN_FRONT_LABEL = "Applicant PAN Front";
const APPLICANT_PAN_BACK_LABEL = "Applicant PAN Back";

const PAGE_TITLES = [
  "Applicant: Personal & Loan",
  "Applicant KYC Documents",
  "Income Details & Documents",
  "Additional Documents",
  "Co-applicant Details",
  "Co-Applicant KYC Documents",
  "Co-Applicant Income Details & Documents",
  "Guarantor Details",
  "Guarantor KYC Documents",
  "Guarantor Income Details & Documents",
  "Terms, Disclaimer & Agreement",
];

export default function ApplyLoan({ navigate, userEmail: userEmailProp, draftLoanId: draftLoanIdProp }) {
  const toast = useToast();
  const userEmail = userEmailProp;
  const draftLoanId = draftLoanIdProp;

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const {
    form,
    files,
    updateField,
    updateRelatedPartyField,
    addRelatedParty,
    removeRelatedParty,
    MAX_RELATED_PARTIES,
    handleFileChange,
    loanSpecificDocs,
    incomeDocs,
    coapplicantIncomeDocs,
    guarantorIncomeDocs,
    clearDraft,
    validate,
    buildFormData,
    loadFromServer,
  } = useLoanForm(userEmail);

  // Load draft from server when ?draft=<loanId> is present
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (!draftLoanId || !userEmail || draftLoaded) return;
    let cancelled = false;
    const loadDraft = async () => {
      try {
        const data = await fetchUserLoanDetail(draftLoanId, userEmail);
        if (!cancelled && data.loan?.status === "Draft") {
          loadFromServer(data.loan, data.applicant);
          toast.info("Draft loaded — continue your application.");
          setDraftLoaded(true);
        }
      } catch {
        // Draft not found or access denied — start fresh
      }
    };
    loadDraft();
    return () => { cancelled = true; };
  }, [draftLoanId, userEmail, draftLoaded, loadFromServer, toast]);

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;

    const loadCibil = async () => {
      try {
        const userLoans = await fetchUserLoans(userEmail);
        const cibil = calculateCibilFromLoanHistory(userLoans || []);
        if (!cancelled) {
          updateField("cibil_score", String(cibil.score));
        }
      } catch {
        if (!cancelled) {
          updateField("cibil_score", "650");
        }
      }
    };

    loadCibil();
    return () => {
      cancelled = true;
    };
  }, [userEmail, updateField]);

  const handleSaveDraft = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    setMessage("");
    try {
      const fd = buildFormData(userEmail, true);
      const data = await submitLoanApplication(fd);
      clearDraft();
      toast.success(data.message || "Draft saved!");
      navigate("user-dashboard");
    } catch (err) {
      setMessage(err.message || "Failed to save draft.");
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const { valid, message: validationMsg } = validate();
    if (!valid) {
      toast.warning(validationMsg);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const fd = buildFormData(userEmail);

      const data = await submitLoanApplication(fd);
      toast.success(data.message || "Loan application submitted!");
      clearDraft();
      navigate("user-dashboard");
    } catch (err) {
      setMessage(err.message || "Submission failed.");
      toast.error(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, display: "block" };
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box"
  };
  const sectionCardStyle = {
    background: "linear-gradient(135deg, rgba(238,243,252,0.82), rgba(255,255,255,0.8))",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.72)",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)"
  };
  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: "800",
    color: "#312e81",
    marginBottom: "8px",
    fontFamily: "'Montserrat', sans-serif"
  };
  const sectionSubtitleStyle = {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "20px"
  };
  const requiredStar = <span style={{ color: "#ef4444" }}>*</span>;
  const getRelatedDocLabel = (type, index, docType) => `${type} ${index + 1} ${docType}`;
  const isLastPage = currentPage === PAGE_TITLES.length - 1;

  const goToPage = (index) => {
    if (index < 0 || index >= PAGE_TITLES.length) return;
    setCurrentPage(index);
  };

  const goNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, PAGE_TITLES.length - 1));
  };

  const goPrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const clearUploadedFile = (docKey) => {
    handleFileChange(docKey, { target: { files: [] } });
  };

  const previewUploadedFile = (docKey) => {
    const file = files[docKey];
    if (!file) return;
    setPreviewFile(file);
    setPreviewTitle(docKey);
  };

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      setPreviewType("");
      return undefined;
    }

    const blobUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(blobUrl);
    setPreviewType(previewFile.type || "");

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [previewFile]);

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewTitle("");
  };

  const renderUploadField = (docKey, options = {}) => {
    const { required = false, accept = undefined, previewLabel = docKey } = options;
    const hasFile = !!files[docKey];

    if (!hasFile) {
      return (
        <>
          <input
            type="file"
            accept={accept}
            required={required}
            style={{ ...inputStyle, padding: "7px 10px" }}
            onChange={(e) => handleFileChange(docKey, e)}
          />
        </>
      );
    }

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => previewUploadedFile(docKey)}
            style={{
              background: "linear-gradient(135deg, #4f46e5, #4338ca)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(79, 70, 229, 0.3)",
            }}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => clearUploadedFile(docKey)}
            aria-label={`Remove ${docKey}`}
            title="Remove uploaded file"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "999px",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              background: "#fff",
              fontWeight: 800,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a" }}>✓ {files[docKey].name}</div>
      </>
    );
  };

  return (
    <div
      className="page-bg-image loan-app-bg"
      style={{
        minHeight: "100dvh",
        width: "100%",
        padding: "40px 20px",
        boxSizing: "border-box",
        background: "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        justifyContent: "center",
        color: "#0f172a",
        fontFamily: "Inter, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1220px",
          background: "rgba(238,243,252,0.84)",
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow: "0 20px 58px rgba(15, 23, 42, 0.08)",
          borderRadius: "20px",
          padding: "32px clamp(14px, 4vw, 40px)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", gap: "16px", flexWrap: "wrap" }}>
          <div>

          <Modal
            open={!!previewFile}
            title={previewTitle || "Document Preview"}
            onClose={closePreview}
            style={{
              minWidth: "unset",
              width: "min(86vw, 920px)",
              maxWidth: "920px",
              padding: "28px 28px 24px",
              borderRadius: "24px",
            }}
          >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Close preview"
                  title="Close"
                  style={{
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#fff",
                    borderRadius: "999px",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: 1,
                    color: "#475569",
                  }}
                >
                  ×
                </button>
              </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "500px",
                maxHeight: "78vh",
                overflow: "auto",
                background: "#f8fafc",
                borderRadius: "20px",
                border: "1px solid rgba(148,163,184,0.18)",
                padding: "16px",
              }}
            >
              {previewUrl && previewType.startsWith("image/") && (
                <img
                  src={previewUrl}
                  alt={previewTitle || "Document preview"}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "72vh",
                    objectFit: "contain",
                    borderRadius: "14px",
                    boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
                  }}
                />
              )}
              {previewUrl && previewType === "application/pdf" && (
                <iframe
                  src={previewUrl}
                  title={previewTitle || "PDF preview"}
                  style={{
                    width: "100%",
                    height: "72vh",
                    border: "none",
                    borderRadius: "14px",
                    background: "#fff",
                  }}
                />
              )}
              {previewUrl && !previewType.startsWith("image/") && previewType !== "application/pdf" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: "32px" }}>
                  <div style={{ fontSize: "44px", marginBottom: "10px" }}>📄</div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Preview not available for this file type</div>
                </div>
              )}
            </div>
          </Modal>
            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "28px", fontWeight: "800", color: "#312e81", margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
              Loan Application
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, maxWidth: "500px", lineHeight: "1.5" }}>
              Complete all 7 pages in sequence for applicant, co-applicant, guarantor, and final agreement.
            </p>
          </div>
          <div style={{ background: "#eef2ff", color: "#4338ca", padding: "8px 16px", borderRadius: "99px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            ALL KEY FIELDS ARE MANDATORY
          </div>
        </div>

        {message && (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(220,38,38,0.08)", color: "#dc2626", marginBottom: 20, fontWeight: 700 }}>
            {message}
          </div>
        )}

        <style>{`
          .loan-app-form input[type="file"]::file-selector-button {
            background: linear-gradient(135deg, #4f46e5, #4338ca);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            margin-right: 10px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 3px 10px rgba(79, 70, 229, 0.3);
          }

          .loan-app-form input[type="file"]:hover::file-selector-button {
            transform: translateY(-1px);
            box-shadow: 0 6px 14px rgba(79, 70, 229, 0.35);
          }

          .loan-app-form input[type="file"]::-webkit-file-upload-button {
            background: linear-gradient(135deg, #4f46e5, #4338ca);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 12px;
            margin-right: 10px;
            cursor: pointer;
            box-shadow: 0 3px 10px rgba(79, 70, 229, 0.3);
          }
        `}</style>

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <aside style={{ flex: "0 0 250px", width: "250px", maxWidth: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "29px" }}>
              {PAGE_TITLES.map((title, index) => {
                const isActive = index === currentPage;
                const isComplete = index < currentPage;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => goToPage(index)}
                    aria-current={isActive ? "step" : undefined}
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
                    {index + 1}. {title}
                  </button>
                );
              })}
            </div>
          </aside>

          <div style={{ flex: "1 1 620px", minWidth: 0 }}>
            <form className="loan-app-form" onSubmit={handleSubmit}>
          {currentPage === 0 && (
            <>
              <div style={sectionCardStyle}>
                <h2 style={sectionTitleStyle}>Personal Information</h2>
                <p style={sectionSubtitleStyle}>Tell us about yourself so we can contact you and verify your profile.</p>

                <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div>
                    <label style={labelStyle}>Full Name {requiredStar}</label>
                    <input placeholder="As per your official ID" style={inputStyle} value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Email {requiredStar}</label>
                    <input type="email" placeholder="you@example.com" style={inputStyle} value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Primary Mobile {requiredStar}</label>
                    <input placeholder="10-digit mobile number" style={inputStyle} value={form.primary_mobile} onChange={(e) => updateField("primary_mobile", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Alternate Mobile</label>
                    <input placeholder="Optional" style={inputStyle} value={form.alternate_mobile} onChange={(e) => updateField("alternate_mobile", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth {requiredStar}</label>
                    <input type="date" style={inputStyle} value={form.dob} onChange={(e) => updateField("dob", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Address Line 1 {requiredStar}</label>
                    <input placeholder="Flat / House / Street" style={inputStyle} value={form.address_line1} onChange={(e) => updateField("address_line1", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Address Line 2 {requiredStar}</label>
                    <input placeholder="Area / Landmark" style={inputStyle} value={form.address_line2} onChange={(e) => updateField("address_line2", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>City {requiredStar}</label>
                    <input placeholder="City" style={inputStyle} value={form.city} onChange={(e) => updateField("city", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>State {requiredStar}</label>
                    <input placeholder="State" style={inputStyle} value={form.state} onChange={(e) => updateField("state", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>PIN / Postal Code {requiredStar}</label>
                    <input placeholder="e.g. 600001" style={inputStyle} value={form.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} required />
                  </div>
                </div>
              </div>

              <div style={sectionCardStyle}>
                <h2 style={sectionTitleStyle}>Loan Details</h2>
                <p style={sectionSubtitleStyle}>Choose your loan amount, interest rate, and tenure. EMI is auto-calculated.</p>
                <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div>
                    <label style={labelStyle}>Loan Amount {requiredStar}</label>
                    <input type="number" placeholder="e.g. 500000" min="1" style={inputStyle} value={form.loan_amount} onChange={(e) => updateField("loan_amount", e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Tenure (Months) {requiredStar}</label>
                    <select style={inputStyle} value={form.tenure} onChange={(e) => updateField("tenure", e.target.value)} required>
                      <option value="">Select Tenure</option>
                      {TENURE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t} months</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Loan Purpose {requiredStar}</label>
                    <select style={inputStyle} value={form.loan_purpose} onChange={(e) => updateField("loan_purpose", e.target.value)} required>
                      <option value="">Select Loan Purpose</option>
                      {LOAN_PURPOSES.map((p) => (
                        <option key={p.value} value={p.value}>{p.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Interest Rate (% per annum) {requiredStar}</label>
                    <input placeholder="Auto-selected by loan type" style={{ ...inputStyle, background: "#f8fafc" }} value={form.interest_rate} readOnly />
                  </div>
                  <div>
                    <label style={labelStyle}>EMI (Monthly)</label>
                    <input placeholder="Calculated automatically" style={{ ...inputStyle, background: "#f8fafc" }} value={form.emi ? `₹ ${form.emi}` : ""} readOnly />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentPage === 1 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Applicant KYC Documents</h2>
              <p style={sectionSubtitleStyle}>Upload Aadhaar and PAN front/back images only in JPG or PNG format.</p>

              <div style={{ marginBottom: "22px", padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Aadhaar Section</h3>
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>Aadhaar Number {requiredStar}</label>
                    <input placeholder="12-digit Aadhaar" style={inputStyle} value={form.aadhaar_number} onChange={(e) => updateField("aadhaar_number", e.target.value.replace(/\D/g, ""))} maxLength={12} required />
                    {form.aadhaar_number && !isValidAadhaar(form.aadhaar_number) && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Invalid Aadhaar. Must be exactly 12 digits.</div>
                    )}
                  </div>
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Aadhaar Front (JPG/PNG) {requiredStar}</label>
                      {renderUploadField(APPLICANT_AADHAAR_FRONT_LABEL, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: APPLICANT_AADHAAR_FRONT_LABEL })}
                    </div>
                    <div>
                      <label style={labelStyle}>Aadhaar Back (JPG/PNG) {requiredStar}</label>
                      {renderUploadField(APPLICANT_AADHAAR_BACK_LABEL, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: APPLICANT_AADHAAR_BACK_LABEL })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>PAN Section</h3>
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>PAN Number {requiredStar}</label>
                    <input placeholder="ABCDE1234F" style={inputStyle} value={form.pan_number} onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())} maxLength={10} required />
                    {form.pan_number && !isValidPAN(form.pan_number) && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Invalid PAN format. Expected: ABCDE1234F</div>
                    )}
                  </div>
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>PAN Front (JPG/PNG) {requiredStar}</label>
                      {renderUploadField(APPLICANT_PAN_FRONT_LABEL, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: APPLICANT_PAN_FRONT_LABEL })}
                    </div>
                    <div>
                      <label style={labelStyle}>PAN Back (JPG/PNG) {requiredStar}</label>
                      {renderUploadField(APPLICANT_PAN_BACK_LABEL, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: APPLICANT_PAN_BACK_LABEL })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === 2 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Income Details & Documents</h2>
              <p style={sectionSubtitleStyle}>Provide your income information to help us assess eligibility.</p>
              <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Monthly Salary / Income {requiredStar}</label>
                  <input type="number" placeholder="e.g. 50000" min="0" style={inputStyle} value={form.monthly_income} onChange={(e) => updateField("monthly_income", e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>CIBIL Score {requiredStar}</label>
                  <input style={{ ...inputStyle, background: "#f8fafc" }} value={form.cibil_score} readOnly />
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                    Auto-calculated from your loan history and repayment status.
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Employer / Organisation {requiredStar}</label>
                  <input placeholder="Company / Institution name" style={inputStyle} value={form.employer_name} onChange={(e) => updateField("employer_name", e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Employment Type {requiredStar}</label>
                  {form.loan_purpose === "Education Loan" ? (
                    <input style={{ ...inputStyle, background: "#f8fafc" }} value="Student" readOnly />
                  ) : (
                    <select style={inputStyle} value={form.employment_type} onChange={(e) => updateField("employment_type", e.target.value)} required>
                      <option value="">Select</option>
                      {EMPLOYMENT_TYPES.filter((t) => t !== "Student").map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                </div>

                {incomeDocs.map((docType) => (
                  <div key={docType}>
                    <label style={labelStyle}>{docType} {requiredStar}</label>
                    {renderUploadField(`Income - ${docType}`, { required: true, previewLabel: docType })}
                  </div>
                ))}

                {form.loan_purpose === "Education Loan" && (
                  <>
                    <div>
                      <label style={labelStyle}>Parent / Guardian Name {requiredStar}</label>
                      <input placeholder="Full name of parent or guardian" style={inputStyle} value={form.parent_name} onChange={(e) => updateField("parent_name", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Parent / Guardian Occupation {requiredStar}</label>
                      <input placeholder="e.g. Government Employee, Business" style={inputStyle} value={form.parent_occupation} onChange={(e) => updateField("parent_occupation", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Parent Annual Income (₹) {requiredStar}</label>
                      <input type="number" placeholder="e.g. 600000" min="1" style={inputStyle} value={form.parent_annual_income} onChange={(e) => updateField("parent_annual_income", e.target.value)} required />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentPage === 3 && (
            <>
              <div style={sectionCardStyle}>
                <h2 style={sectionTitleStyle}>Additional Documents</h2>
                <p style={sectionSubtitleStyle}>Upload all documents required for selected loan purpose.</p>
                {loanSpecificDocs.length > 0 ? (
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                    {loanSpecificDocs.map((docType) => (
                      <div key={docType}>
                        <label style={labelStyle}>{docType} {requiredStar}</label>
                        {renderUploadField(docType, { required: true, previewLabel: docType })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>No additional documents required for the selected loan purpose.</div>
                )}
              </div>
            </>
          )}

          {currentPage === 4 && (
            <div style={sectionCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h2 style={sectionTitleStyle}>Co-applicant Details</h2>
                <p style={sectionSubtitleStyle}>Add up to 3 co-applicants with identity, contact, and address details.</p>
              </div>
              <button
                type="button"
                onClick={() => addRelatedParty("coapplicants")}
                disabled={(form.coapplicants || []).length >= MAX_RELATED_PARTIES}
                style={{ background: "#4338ca", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: (form.coapplicants || []).length >= MAX_RELATED_PARTIES ? "not-allowed" : "pointer", opacity: (form.coapplicants || []).length >= MAX_RELATED_PARTIES ? 0.6 : 1 }}
              >
                Add Co-applicant
              </button>
              <button
                type="button"
                onClick={() => removeRelatedParty("coapplicants")}
                disabled={(form.coapplicants || []).length <= 1}
                style={{ background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: (form.coapplicants || []).length <= 1 ? "not-allowed" : "pointer", opacity: (form.coapplicants || []).length <= 1 ? 0.6 : 1 }}
              >
                Remove
              </button>
            </div>

            {(form.coapplicants || []).map((coapplicant, index) => {
              return (
                <div key={`coapplicant-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                  <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Co-applicant {index + 1}</h3>
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Full Name {requiredStar}</label>
                      <input placeholder="Co-applicant full name" style={inputStyle} value={coapplicant.full_name || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "full_name", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Contact Email</label>
                      <input type="email" placeholder="coapplicant@example.com" style={inputStyle} value={coapplicant.contact_email || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "contact_email", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship {requiredStar}</label>
                      <select style={inputStyle} value={coapplicant.relationship || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "relationship", e.target.value)} required>
                        <option value="">Select relationship</option>
                        {COAPPLICANT_RELATIONSHIP_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Mobile {requiredStar}</label>
                      <input placeholder="10-digit co-applicant mobile" style={inputStyle} value={coapplicant.primary_mobile || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "primary_mobile", e.target.value.replace(/\D/g, ""))} maxLength={10} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Birth {requiredStar}</label>
                      <input type="date" style={inputStyle} value={coapplicant.dob || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "dob", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Address Line 1 {requiredStar}</label>
                      <input placeholder="House / Street" style={inputStyle} value={coapplicant.address_line1 || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "address_line1", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Address Line 2</label>
                      <input placeholder="Area / Landmark" style={inputStyle} value={coapplicant.address_line2 || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "address_line2", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>City {requiredStar}</label>
                      <input placeholder="City" style={inputStyle} value={coapplicant.city || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "city", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>State {requiredStar}</label>
                      <input placeholder="State" style={inputStyle} value={coapplicant.state || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "state", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Postal Code {requiredStar}</label>
                      <input placeholder="6-digit PIN" style={inputStyle} value={coapplicant.postal_code || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "postal_code", e.target.value.replace(/\D/g, ""))} maxLength={6} required />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {currentPage === 5 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Co-Applicant KYC Documents</h2>
              <p style={sectionSubtitleStyle}>Provide PAN, Aadhaar numbers and upload proof documents for each co-applicant.</p>

              {(form.coapplicants || []).map((coapplicant, index) => {
                const panFrontLabel = getRelatedDocLabel("Co-applicant", index, "PAN Front");
                const panBackLabel = getRelatedDocLabel("Co-applicant", index, "PAN Back");
                const aadhaarFrontLabel = getRelatedDocLabel("Co-applicant", index, "Aadhaar Front");
                const aadhaarBackLabel = getRelatedDocLabel("Co-applicant", index, "Aadhaar Back");

                return (
                  <div key={`coapplicant-kyc-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Co-applicant {index + 1}</h3>

                    <div style={{ marginBottom: "16px", padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "14px", fontWeight: 700 }}>Aadhaar Section</h4>
                      <div style={{ display: "grid", gap: "16px" }}>
                        <div>
                          <label style={labelStyle}>Aadhaar Number {requiredStar}</label>
                          <input placeholder="12-digit Aadhaar" style={inputStyle} value={coapplicant.aadhaar_number || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "aadhaar_number", e.target.value.replace(/\D/g, ""))} maxLength={12} required />
                        </div>
                        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                          <div>
                            <label style={labelStyle}>Aadhaar Front (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(aadhaarFrontLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${aadhaarFrontLabel}` })}
                          </div>
                          <div>
                            <label style={labelStyle}>Aadhaar Back (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(aadhaarBackLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${aadhaarBackLabel}` })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "14px", fontWeight: 700 }}>PAN Section</h4>
                      <div style={{ display: "grid", gap: "16px" }}>
                        <div>
                          <label style={labelStyle}>PAN Number {requiredStar}</label>
                          <input placeholder="ABCDE1234F" style={inputStyle} value={coapplicant.pan_number || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "pan_number", e.target.value.toUpperCase())} maxLength={10} required />
                        </div>
                        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                          <div>
                            <label style={labelStyle}>PAN Front (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(panFrontLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${panFrontLabel}` })}
                          </div>
                          <div>
                            <label style={labelStyle}>PAN Back (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(panBackLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${panBackLabel}` })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginTop: "16px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                          Upload clear JPG/PNG files for fast verification.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentPage === 6 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Co-Applicant Income Details & Documents</h2>
              <p style={sectionSubtitleStyle}>Employment type decides which additional income documents are required for each co-applicant.</p>

              {(form.coapplicants || []).map((coapplicant, index) => {
                const incomeDocConfig = coapplicantIncomeDocs[index] || { docs: [] };
                return (
                  <div key={`coapplicant-income-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Co-applicant {index + 1}</h3>
                    <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                      <div>
                        <label style={labelStyle}>Monthly Income (₹) {requiredStar}</label>
                        <input type="number" placeholder="e.g. 40000" min="1" style={inputStyle} value={coapplicant.monthly_income || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "monthly_income", e.target.value)} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Employer Name</label>
                        <input placeholder="Company / Organisation" style={inputStyle} value={coapplicant.employer_name || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "employer_name", e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Employment Type {requiredStar}</label>
                        <select style={inputStyle} value={coapplicant.employment_type || ""} onChange={(e) => updateRelatedPartyField("coapplicants", index, "employment_type", e.target.value)} required>
                          <option value="">Select</option>
                          {EMPLOYMENT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {incomeDocConfig.docs.map((docType) => (
                        <div key={docType}>
                          <label style={labelStyle}>{docType} {requiredStar}</label>
                          {renderUploadField(docType, { required: true, previewLabel: docType })}
                        </div>
                      ))}
                    </div>

                    {(!coapplicant.employment_type || incomeDocConfig.docs.length === 0) && (
                      <div style={{ marginTop: "10px", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                        Select employment type to view required co-applicant income documents.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentPage === 7 && (
            <div style={sectionCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h2 style={sectionTitleStyle}>Guarantor Details</h2>
                <p style={sectionSubtitleStyle}>Add up to 3 guarantors with identity, contact, and address details.</p>
              </div>
              <button
                type="button"
                onClick={() => addRelatedParty("guarantors")}
                disabled={(form.guarantors || []).length >= MAX_RELATED_PARTIES}
                style={{ background: "#4338ca", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: (form.guarantors || []).length >= MAX_RELATED_PARTIES ? "not-allowed" : "pointer", opacity: (form.guarantors || []).length >= MAX_RELATED_PARTIES ? 0.6 : 1 }}
              >
                Add Guarantor
              </button>
              <button
                type="button"
                onClick={() => removeRelatedParty("guarantors")}
                disabled={(form.guarantors || []).length <= 1}
                style={{ background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: (form.guarantors || []).length <= 1 ? "not-allowed" : "pointer", opacity: (form.guarantors || []).length <= 1 ? 0.6 : 1 }}
              >
                Remove
              </button>
            </div>

            {(form.guarantors || []).map((guarantor, index) => {
              return (
                <div key={`guarantor-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                  <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Guarantor {index + 1}</h3>
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Full Name {requiredStar}</label>
                      <input placeholder="Guarantor full name" style={inputStyle} value={guarantor.full_name || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "full_name", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Contact Email</label>
                      <input type="email" placeholder="guarantor@example.com" style={inputStyle} value={guarantor.contact_email || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "contact_email", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship {requiredStar}</label>
                      <select style={inputStyle} value={guarantor.relationship || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "relationship", e.target.value)} required>
                        <option value="">Select relationship</option>
                        {GUARANTOR_RELATIONSHIP_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Mobile {requiredStar}</label>
                      <input placeholder="10-digit guarantor mobile" style={inputStyle} value={guarantor.primary_mobile || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "primary_mobile", e.target.value.replace(/\D/g, ""))} maxLength={10} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Birth {requiredStar}</label>
                      <input type="date" style={inputStyle} value={guarantor.dob || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "dob", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Address Line 1 {requiredStar}</label>
                      <input placeholder="House / Street" style={inputStyle} value={guarantor.address_line1 || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "address_line1", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Address Line 2</label>
                      <input placeholder="Area / Landmark" style={inputStyle} value={guarantor.address_line2 || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "address_line2", e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>City {requiredStar}</label>
                      <input placeholder="City" style={inputStyle} value={guarantor.city || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "city", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>State {requiredStar}</label>
                      <input placeholder="State" style={inputStyle} value={guarantor.state || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "state", e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Postal Code {requiredStar}</label>
                      <input placeholder="6-digit PIN" style={inputStyle} value={guarantor.postal_code || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "postal_code", e.target.value.replace(/\D/g, ""))} maxLength={6} required />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {currentPage === 8 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Guarantor KYC Documents</h2>
              <p style={sectionSubtitleStyle}>Provide PAN, Aadhaar numbers and upload proof documents for each guarantor.</p>

              {(form.guarantors || []).map((guarantor, index) => {
                const panFrontLabel = getRelatedDocLabel("Guarantor", index, "PAN Front");
                const panBackLabel = getRelatedDocLabel("Guarantor", index, "PAN Back");
                const aadhaarFrontLabel = getRelatedDocLabel("Guarantor", index, "Aadhaar Front");
                const aadhaarBackLabel = getRelatedDocLabel("Guarantor", index, "Aadhaar Back");

                return (
                  <div key={`guarantor-kyc-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Guarantor {index + 1}</h3>

                    <div style={{ marginBottom: "16px", padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "14px", fontWeight: 700 }}>Aadhaar Section</h4>
                      <div style={{ display: "grid", gap: "16px" }}>
                        <div>
                          <label style={labelStyle}>Aadhaar Number {requiredStar}</label>
                          <input placeholder="12-digit Aadhaar" style={inputStyle} value={guarantor.aadhaar_number || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "aadhaar_number", e.target.value.replace(/\D/g, ""))} maxLength={12} required />
                        </div>
                        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                          <div>
                            <label style={labelStyle}>Aadhaar Front (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(aadhaarFrontLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${aadhaarFrontLabel}` })}
                          </div>
                          <div>
                            <label style={labelStyle}>Aadhaar Back (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(aadhaarBackLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${aadhaarBackLabel}` })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "14px", background: "#eef2ff", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "14px", fontWeight: 700 }}>PAN Section</h4>
                      <div style={{ display: "grid", gap: "16px" }}>
                        <div>
                          <label style={labelStyle}>PAN Number {requiredStar}</label>
                          <input placeholder="ABCDE1234F" style={inputStyle} value={guarantor.pan_number || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "pan_number", e.target.value.toUpperCase())} maxLength={10} required />
                        </div>
                        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                          <div>
                            <label style={labelStyle}>PAN Front (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(panFrontLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${panFrontLabel}` })}
                          </div>
                          <div>
                            <label style={labelStyle}>PAN Back (JPG/PNG) {requiredStar}</label>
                            {renderUploadField(panBackLabel, { required: true, accept: ".jpg,.jpeg,.png,image/png,image/jpeg", previewLabel: `${panBackLabel}` })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginTop: "16px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                          Upload clear JPG/PNG files for fast verification.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentPage === 9 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Guarantor Income Details & Documents</h2>
              <p style={sectionSubtitleStyle}>Employment type decides which additional income documents are required for each guarantor.</p>

              {(form.guarantors || []).map((guarantor, index) => {
                const incomeDocConfig = guarantorIncomeDocs[index] || { docs: [] };
                return (
                  <div key={`guarantor-income-${index}`} style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe", background: "rgba(224,231,255,0.35)" }}>
                    <h3 style={{ margin: "0 0 12px 0", color: "#3730a3", fontSize: "15px", fontWeight: 700 }}>Guarantor {index + 1}</h3>
                    <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                      <div>
                        <label style={labelStyle}>Monthly Income (₹) {requiredStar}</label>
                        <input type="number" placeholder="e.g. 50000" min="1" style={inputStyle} value={guarantor.monthly_income || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "monthly_income", e.target.value)} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Employer Name</label>
                        <input placeholder="Company / Organisation" style={inputStyle} value={guarantor.employer_name || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "employer_name", e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Employment Type {requiredStar}</label>
                        <select style={inputStyle} value={guarantor.employment_type || ""} onChange={(e) => updateRelatedPartyField("guarantors", index, "employment_type", e.target.value)} required>
                          <option value="">Select</option>
                          {EMPLOYMENT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {incomeDocConfig.docs.map((docType) => (
                        <div key={docType}>
                          <label style={labelStyle}>{docType} {requiredStar}</label>
                          {renderUploadField(docType, { required: true, previewLabel: docType })}
                        </div>
                      ))}
                    </div>

                    {(!guarantor.employment_type || incomeDocConfig.docs.length === 0) && (
                      <div style={{ marginTop: "10px", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                        Select employment type to view required guarantor income documents.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentPage === 10 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Terms, Conditions, Disclaimer & Agreement</h2>
              <p style={sectionSubtitleStyle}>Review and confirm before saving draft or submitting your final application.</p>

              <div style={{ background: "#eef2ff", borderRadius: "10px", padding: "16px", marginBottom: "16px", border: "1px solid #c7d2fe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#312e81", margin: "0 0 8px 0" }}>Terms & Policies</h3>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
                  <li>Provided details and documents must be correct and authentic.</li>
                  <li>Application approval is subject to lender verification and policy checks.</li>
                  <li>Interest rate, tenure, and EMI may change after underwriting review.</li>
                  <li>Draft saves are for convenience and are not considered submitted applications.</li>
                  <li>Final sanction terms will override any preliminary values shown here.</li>
                </ul>
              </div>

              <div style={{ background: "#fff7ed", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #fed7aa" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#9a3412", margin: "0 0 8px 0" }}>Disclaimer</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#7c2d12", lineHeight: "1.6" }}>
                  Submission of this application does not guarantee sanction. All approvals are subject to verification, risk assessment, and lender policy at the time of processing.
                </p>
              </div>

              <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>
                  <input type="radio" name="agreement" value="accept" checked={form.agreement === "accept"} onChange={(e) => updateField("agreement", e.target.value)} required />
                  Accept Agreement
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>
                  <input type="radio" name="agreement" value="deny" checked={form.agreement === "deny"} onChange={(e) => updateField("agreement", e.target.value)} required />
                  Deny Agreement
                </label>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "32px", flexWrap: "wrap", gap: "16px" }}>
            <button
              type="button"
              onClick={currentPage === 0 ? () => navigate("user-dashboard") : goPrevious}
              style={{ background: "none", border: "none", color: "#4338ca", fontWeight: "700", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", padding: "12px 16px" }}
            >
              {currentPage === 0 ? "Back" : "Previous"}
            </button>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              {isLastPage && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  style={{ background: "transparent", border: "none", color: "#4338ca", fontWeight: "700", fontSize: "15px", cursor: savingDraft ? "not-allowed" : "pointer", padding: "12px 16px", opacity: savingDraft ? 0.7 : 1 }}
                >
                  {savingDraft ? "Saving..." : "Save Draft"}
                </button>
              )}

              {!isLastPage ? (
                <button
                  type="button"
                  className="btn-blue"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", color: "var(--text-on-accent)", border: "none", borderRadius: "12px", padding: "16px 32px", fontWeight: "700", fontSize: "15px", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
                  onClick={goNext}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-blue"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", color: "var(--text-on-accent)", border: "none", borderRadius: "12px", padding: "16px 32px", fontWeight: "700", fontSize: "15px", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
                  onMouseOver={(e) => !submitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseOut={(e) => !submitting && (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {submitting ? "Submitting..." : "APPLY FOR LOAN"}
                </button>
              )}
            </div>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
