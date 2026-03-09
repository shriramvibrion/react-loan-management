import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { submitLoanApplication, fetchUserLoanDetail } from "../services/loanService";
import {
  LOAN_PURPOSES,
  EMPLOYMENT_TYPES,
  TENURE_OPTIONS,
} from "../constants";
import useLoanForm from "../hooks/useLoanForm";

export default function ApplyLoan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftLoanId = searchParams.get("draft");
  const { userEmail } = useAuth();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [message, setMessage] = useState("");

  const {
    form,
    files,
    updateField,
    handleFileChange,
    loanSpecificDocs,
    incomeDocs,
    clearDraft,
    validate,
    buildFormData,
    loadFromServer,
  } = useLoanForm();

  // Load draft from server when ?draft=<loanId> is present
  useEffect(() => {
    if (!draftLoanId || !userEmail) return;
    let cancelled = false;
    const loadDraft = async () => {
      try {
        const data = await fetchUserLoanDetail(draftLoanId, userEmail);
        if (!cancelled && data.loan?.status === "Draft") {
          loadFromServer(data.loan, data.applicant);
          toast.info("Draft loaded — continue your application.");
        }
      } catch {
        // Draft not found or access denied — start fresh
      }
    };
    loadDraft();
    return () => { cancelled = true; };
  }, [draftLoanId, userEmail, loadFromServer, toast]);

  const handleSaveDraft = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    setMessage("");
    try {
      const fd = buildFormData(userEmail, true);
      const data = await submitLoanApplication(fd);
      clearDraft();
      toast.success(data.message || "Draft saved!");
      navigate("/user/dashboard");
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
      navigate("/user/dashboard");
    } catch (err) {
      setMessage(err.message || "Submission failed.");
      toast.error(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 700, color: "#2d3748", marginBottom: 6, display: "block" };
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box"
  };
  const sectionCardStyle = {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    marginBottom: "24px"
  };
  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: "800",
    color: "#1a5fc4",
    marginBottom: "8px"
  };
  const sectionSubtitleStyle = {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "20px"
  };
  const requiredStar = <span style={{ color: "#ef4444" }}>*</span>;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "40px 20px",
        boxSizing: "border-box",
        background: "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)",
        overflowX: "hidden",
        overflowY: "auto",
        display: "flex",
        justifyContent: "center",
        color: "#0f172a",
        fontFamily: "Inter, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.08)",
          borderRadius: "18px",
          padding: "32px 40px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: "28px", fontWeight: "900", color: "#1a5fc4", margin: "0 0 8px 0" }}>
              Loan Application
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, maxWidth: "500px", lineHeight: "1.5" }}>
              Provide your personal details, loan preferences, and key documents for a smooth and secure approval process.
            </p>
          </div>
          <div style={{ background: "#eff6ff", color: "#1a5fc4", padding: "8px 16px", borderRadius: "99px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            ALL KEY FIELDS ARE MANDATORY
          </div>
        </div>

        {message && (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(220,38,38,0.08)", color: "#dc2626", marginBottom: 20, fontWeight: 700 }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Personal Information</h2>
            <p style={sectionSubtitleStyle}>Tell us about yourself so we can contact you and verify your profile.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
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

          {/* Loan Details */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Loan Details</h2>
            <p style={sectionSubtitleStyle}>Choose your loan amount, interest rate, and tenure. EMI is auto-calculated.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
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
                <input placeholder="Auto-selected by loan type" style={{...inputStyle, background: "#f8fafc"}} value={form.interest_rate} readOnly />
              </div>
              <div>
                <label style={labelStyle}>EMI (Monthly)</label>
                <input placeholder="Calculated automatically" style={{...inputStyle, background: "#f8fafc"}} value={form.emi ? `₹ ${form.emi}` : ""} readOnly />
              </div>
            </div>
          </div>

          {/* KYC Documents */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>KYC Documents</h2>
            <p style={sectionSubtitleStyle}>Basic identity and address verification. Keep the latest documents handy while submitting the final application.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={labelStyle}>PAN Number {requiredStar}</label>
                <input placeholder="ABCDE1234F" style={inputStyle} value={form.pan_number} onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())} maxLength={10} required />
              </div>
              <div>
                <label style={labelStyle}>PAN File {requiredStar}</label>
                <input type="file" style={{...inputStyle, padding: "7px 10px"}} onChange={(e) => handleFileChange("pan_file", e)} />
                {files["pan_file"] && <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a" }}>✓ {files["pan_file"].name}</div>}
              </div>
              <div>
                <label style={labelStyle}>Aadhaar Number {requiredStar}</label>
                <input placeholder="12-digit Aadhaar" style={inputStyle} value={form.aadhaar_number} onChange={(e) => updateField("aadhaar_number", e.target.value)} maxLength={12} required />
              </div>
              <div>
                <label style={labelStyle}>Aadhaar File {requiredStar}</label>
                <input type="file" style={{...inputStyle, padding: "7px 10px"}} onChange={(e) => handleFileChange("aadhaar_file", e)} />
                {files["aadhaar_file"] && <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a" }}>✓ {files["aadhaar_file"].name}</div>}
              </div>
            </div>
          </div>

          {/* Income Details & Documents */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Income Details & Documents</h2>
            <p style={sectionSubtitleStyle}>Provide your income information to help us assess eligibility.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div>
                <label style={labelStyle}>Monthly Salary / Income {requiredStar}</label>
                <input type="number" placeholder="e.g. 50000" min="0" style={inputStyle} value={form.monthly_income} onChange={(e) => updateField("monthly_income", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Employer / Organisation {requiredStar}</label>
                <input placeholder="Company / Institution name" style={inputStyle} value={form.employer_name} onChange={(e) => updateField("employer_name", e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Employment Type {requiredStar}</label>
                <select style={inputStyle} value={form.employment_type} onChange={(e) => updateField("employment_type", e.target.value)} required>
                  <option value="">Select</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t} disabled={t === "Student" && form.loan_purpose !== "Education Loan"}>{t}</option>
                  ))}
                </select>
              </div>
              
              {incomeDocs.map((docType) => (
                <div key={docType}>
                  <label style={labelStyle}>{docType} {requiredStar}</label>
                  <input type="file" required style={{...inputStyle, padding: "7px 10px"}} onChange={(e) => handleFileChange(docType, e)} />
                  {files[docType] && <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a" }}>✓ {files[docType].name}</div>}
                </div>
              ))}

            </div>
          </div>

          {/* Loan-Specific Documents */}
          {loanSpecificDocs.length > 0 && (
            <div style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>Additional Documents — {form.loan_purpose}</h2>
              <p style={sectionSubtitleStyle}>These documents are required specifically for a {form.loan_purpose} application.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {loanSpecificDocs.map((docType) => (
                  <div key={docType}>
                    <label style={labelStyle}>{docType} {requiredStar}</label>
                    <input type="file" required style={{...inputStyle, padding: "7px 10px"}} onChange={(e) => handleFileChange(docType, e)} />
                    {files[docType] && <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a" }}>✓ {files[docType].name}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agreement Confirmation */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Agreement Confirmation {requiredStar}</h2>
            <p style={sectionSubtitleStyle}>Confirm your agreement decision before saving draft or submitting.</p>
            
            <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "16px", marginBottom: "16px", border: "1px solid #dbeafe" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a8a", margin: "0 0 8px 0" }}>Terms {"&"} Policies</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
                <li>Provided details and documents must be correct and authentic.</li>
                <li>Application approval is subject to lender verification and policy checks.</li>
                <li>Interest rate, tenure, and EMI may change after underwriting review.</li>
                <li>Draft saves are for convenience and are not considered submitted applications.</li>
                <li>Final sanction terms will override any preliminary values shown here.</li>
              </ul>
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

          {/* Additional Notes */}
          <div style={sectionCardStyle}>
            <h2 style={sectionTitleStyle}>Additional Notes <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "400" }}>*</span></h2>
            <textarea 
              placeholder="Share any special requirements or clarifications for your loan." 
              style={{...inputStyle, minHeight: "100px", resize: "vertical"}} 
              value={form.notes} 
              onChange={(e) => updateField("notes", e.target.value)}
              required
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "32px", flexWrap: "wrap", gap: "16px" }}>
            <button 
              type="button" 
              onClick={() => navigate("/user/dashboard")} 
              style={{ background: "none", border: "none", color: "#1a5fc4", fontWeight: "700", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", padding: "12px 16px" }}
            >
               Back
            </button>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <button 
                type="button" 
                onClick={handleSaveDraft} 
                style={{ background: "transparent", border: "none", color: "#1a5fc4", fontWeight: "800", fontSize: "15px", cursor: "pointer", padding: "12px 16px" }}
              >
                Save Draft
              </button>
              <button 
                type="submit" 
                disabled={submitting} 
                className="btn-blue"
                style={{ background: "#1a5fc4", color: "#fff", border: "none", borderRadius: "8px", padding: "16px 32px", fontWeight: "800", fontSize: "15px", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, transition: "transform 0.2s, background 0.2s", boxShadow: "0 4px 14px rgba(26, 95, 196, 0.4)" }}
                onMouseOver={(e) => !submitting && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={(e) => !submitting && (e.currentTarget.style.transform = "translateY(0)")}
              >
                {submitting ? "Submitting..." : "APPLY FOR LOAN"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
