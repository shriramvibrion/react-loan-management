import { useEffect, useMemo, useState } from "react";

export default function ApplyLoan({ navigate, userEmail }) {
  const [form, setForm] = useState({
    // Personal information
    full_name: "",
    contact_email: "",
    primary_mobile: "",
    alternate_mobile: "",
    dob: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    // Loan details
    loan_amount: "",
    tenure: "",
    interest_rate: "",
    loan_purpose: "",
    // KYC & income
    pan_number: "",
    aadhaar_number: "",
    monthly_income: "",
    employer_name: "",
    employment_type: "",
    // Additional
    notes: "",
  });

  const [loanDocuments, setLoanDocuments] = useState({});
  const [employmentDocuments, setEmploymentDocuments] = useState({});

  // Individual file inputs for core KYC / income documents
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [incomeTaxFile, setIncomeTaxFile] = useState(null);
  const [taxDocFile, setTaxDocFile] = useState(null);
  const [employmentProofFile, setEmploymentProofFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [agreementDecision, setAgreementDecision] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftStorageKey = userEmail ? `loan_draft_${userEmail}` : "";

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved?.form) return;

      setForm((prev) => ({ ...prev, ...saved.form }));
      setAgreementDecision(saved.agreementDecision || "");
      setDraftLoaded(true);
    } catch (err) {
      // Ignore malformed local draft data.
    }
  }, [draftStorageKey]);

  const getInterestRateByLoanPurpose = (purpose) => {
    if (purpose === "Home Loan") return "8.50";
    if (purpose === "Education Loan") return "9.00";
    if (purpose === "Personal Loan") return "12.50";
    if (purpose === "Vehicle Loan") return "9.50";
    if (purpose === "Business Loan") return "13.00";
    if (purpose === "Other") return "11.00";
    return "";
  };

  const emiValue = useMemo(() => {
    const principal = Number(form.loan_amount);
    const annualRate = Number(form.interest_rate);
    const months = Number(form.tenure);

    if (principal <= 0 || annualRate <= 0 || months <= 0) {
      return "";
    }

    const monthlyRate = annualRate / (12 * 100);
    const powerTerm = Math.pow(1 + monthlyRate, months);
    const emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1);

    if (!Number.isFinite(emi)) {
      return "";
    }

    return emi.toFixed(2);
  }, [form.loan_amount, form.interest_rate, form.tenure]);

  const handleApply = async (submissionType = "submit") => {
    setMessage("");

    if (!userEmail) {
      setMessage("No user session. Please login again.");
      return;
    }

    if (submissionType === "draft") {
      if (!draftStorageKey) {
        setMessage("Unable to save draft without active user session.");
        return;
      }
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            form,
            agreementDecision,
            savedAt: new Date().toISOString(),
          })
        );
        setDraftLoaded(true);
        setMessage("Draft saved locally on this device.");
      } catch (err) {
        setMessage("Failed to save draft locally.");
      }
      return;
    }

    if (!agreementDecision) {
      setMessage("Please select agreement decision (Accept or Deny).");
      return;
    }

    if (submissionType === "submit") {
      if (agreementDecision !== "accepted") {
        setMessage("You must accept the agreement to submit. You can still save as draft.");
        return;
      }

      const requiredFields = [
        "full_name",
        "contact_email",
        "primary_mobile",
        "dob",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "loan_amount",
        "tenure",
        "interest_rate",
        "loan_purpose",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "employer_name",
        "employment_type",
        "notes",
      ];

      const missing = requiredFields.filter(
        (field) => !String(form[field] || "").trim()
      );

      if (missing.length > 0) {
        setMessage("All fields are mandatory.");
        return;
      }

      if (Number(form.loan_amount) <= 0 || Number(form.tenure) <= 0) {
        setMessage("Loan amount and tenure must be greater than zero.");
        return;
      }

      if (Number(form.interest_rate) <= 0) {
        setMessage("Interest rate must be greater than zero.");
        return;
      }

      if (Number(form.monthly_income) <= 0) {
        setMessage("Monthly income must be greater than zero.");
        return;
      }

      if (!panFile || !aadhaarFile || !incomeTaxFile || !taxDocFile || !employmentProofFile) {
        setMessage("Please upload all mandatory files (PAN, Aadhaar, Income Tax, Tax Document, Employment Proof).");
        return;
      }

      const missingLoanDocs = getLoanSpecificDocs().filter((docType) => !loanDocuments[docType]);
      if (missingLoanDocs.length > 0) {
        setMessage(`Please upload all mandatory loan documents: ${missingLoanDocs.join(", ")}.`);
        return;
      }

      const missingEmploymentDocs = getEmploymentSpecificDocs().filter(
        (docType) => !employmentDocuments[docType]
      );
      if (missingEmploymentDocs.length > 0) {
        setMessage(`Please upload all mandatory employment documents: ${missingEmploymentDocs.join(", ")}.`);
        return;
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // Core linkage + financials
      formData.append("email", userEmail);
      formData.append("loan_amount", form.loan_amount);
      formData.append("tenure", form.tenure);
      formData.append("interest_rate", form.interest_rate);
      formData.append("emi", emiValue);
      formData.append("loan_purpose", form.loan_purpose);
      formData.append("submission_type", submissionType);
      formData.append("agreement_decision", agreementDecision);

      // Personal information
      formData.append("full_name", form.full_name);
      formData.append("contact_email", form.contact_email);
      formData.append("primary_mobile", form.primary_mobile);
      formData.append("alternate_mobile", form.alternate_mobile);
      formData.append("dob", form.dob);
      formData.append("address_line1", form.address_line1);
      formData.append("address_line2", form.address_line2);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("postal_code", form.postal_code);

      // KYC & income
      formData.append("pan_number", form.pan_number);
      formData.append("aadhaar_number", form.aadhaar_number);
      formData.append("monthly_income", form.monthly_income);
      formData.append("employer_name", form.employer_name);
      formData.append("employment_type", form.employment_type);

      // Additional
      formData.append("notes", form.notes);

      // Attach single, named files
      if (panFile) {
        formData.append("pan_file", panFile);
      }
      if (aadhaarFile) {
        formData.append("aadhaar_file", aadhaarFile);
      }
      if (incomeTaxFile) {
        formData.append("income_tax_certificate", incomeTaxFile);
      }
      if (taxDocFile) {
        formData.append("tax_document", taxDocFile);
      }
      if (employmentProofFile) {
        formData.append("employment_proof", employmentProofFile);
      }

      // Dynamic loan-specific documents
      Object.entries(loanDocuments).forEach(([docType, file]) => {
        if (file) {
          formData.append("document_types[]", docType);
          formData.append("document_files[]", file);
        }
      });

      // Dynamic employment-type specific income documents
      Object.entries(employmentDocuments).forEach(([docType, file]) => {
        if (file) {
          formData.append("document_types[]", `Income - ${docType}`);
          formData.append("document_files[]", file);
        }
      });

      const res = await fetch("http://localhost:5000/api/loan/apply", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (draftStorageKey) {
          localStorage.removeItem(draftStorageKey);
        }
        setDraftLoaded(false);
        setMessage(
          data.message ||
            (submissionType === "draft"
              ? "Loan draft saved successfully."
              : "Loan applied successfully.")
        );
      } else {
        setMessage(data.error || data.message || "Failed to apply loan.");
      }
    } catch (err) {
      setMessage("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getLoanSpecificDocs = () => {
    const purpose = form.loan_purpose;
    if (purpose === "Home Loan")
      return ["Land Document", "Approved Building Plan", "Property Registration"];
    if (purpose === "Education Loan")
      return ["Bonafide Certificate", "Fee Structure", "Academic Records"];
    if (purpose === "Vehicle Loan")
      return ["Proforma Invoice", "RC Copy"];
    if (purpose === "Business Loan")
      return ["Business Registration Proof", "Bank Statements", "GST Certificate"];
    return [];
  };

  const getEmploymentSpecificDocs = () => {
    const type = form.employment_type;
    if (type === "Salaried")
      return ["Latest 3 Salary Slips", "Form 16", "Bank Statement (6 Months)"];
    if (type === "Self-Employed")
      return ["ITR (Last 2 Years)", "Business Bank Statement", "Profit & Loss Statement", "GST Returns"];
    if (type === "Student")
      return ["Co-applicant Income Proof", "Sponsor Bank Statement"];
    if (type === "Retired")
      return ["Pension Statement", "Bank Statement (6 Months)"];
    if (type === "Other")
      return ["Income Source Proof", "Recent Bank Statement"];
    return [];
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "20px",
        boxSizing: "border-box",
        background: "radial-gradient(900px 600px at 18% 10%, rgba(43,125,233,0.20) 0%, rgba(43,125,233,0) 55%), linear-gradient(160deg, #f8fafc 0%, #f3f4f6 45%, #eef2f7 100%)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 18,
          padding: "32px",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.12)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            gap: 12,
          }}
        >
          <div>
            <div className="card-title-blue">Loan Application</div>
            <div
              style={{
                fontSize: 13,
                color: "#555",
                marginTop: 4,
                maxWidth: 540,
              }}
            >
              Provide your personal details, loan preferences, and key documents
              for a smooth and secure approval process.
            </div>
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(43,125,233,0.1)",
              color: "#1a5fc4",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              whiteSpace: "nowrap",
              alignSelf: "center",
            }}
          >
            All key fields are mandatory
          </div>
        </div>

        {/* Personal Information */}
        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
            Personal Information
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Tell us about yourself so we can contact you and verify your profile.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Full Name<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="As per your official ID"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Contact Email<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="you@example.com"
                type="email"
                value={form.contact_email}
                onChange={(e) => updateField("contact_email", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Primary Mobile<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="10-digit mobile number"
                type="tel"
                value={form.primary_mobile}
                onChange={(e) => updateField("primary_mobile", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Alternate Mobile
              </label>
              <input
                className="input-field"
                placeholder="Optional"
                type="tel"
                value={form.alternate_mobile}
                onChange={(e) => updateField("alternate_mobile", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Date of Birth<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                type="date"
                value={form.dob}
                onChange={(e) => updateField("dob", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Address Line 1<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="Flat / House / Street"
                value={form.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Address Line 2<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="Area / Landmark"
                value={form.address_line2}
                onChange={(e) => updateField("address_line2", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                City<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="City"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                State<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="State"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                PIN / Postal Code<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. 600001"
                value={form.postal_code}
                onChange={(e) => updateField("postal_code", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Loan Details */}
        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
            Loan Details
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Choose your loan amount, interest rate, and tenure. EMI is auto-calculated.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Loan Amount<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. 500000"
                type="number"
                value={form.loan_amount}
                onChange={(e) => updateField("loan_amount", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Tenure (Months)<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <select
                className="input-field"
                value={form.tenure}
                onChange={(e) => updateField("tenure", e.target.value)}
              >
                <option value="">Select Tenure</option>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="36">36</option>
                <option value="45">45</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Loan Purpose<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <select
                className="input-field"
                value={form.loan_purpose}
                onChange={(e) => {
                  const selectedPurpose = e.target.value;
                  updateField("loan_purpose", selectedPurpose);
                  updateField("interest_rate", getInterestRateByLoanPurpose(selectedPurpose));
                }}
              >
                <option value="">Select Loan Purpose</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Education Loan">Education Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Vehicle Loan">Vehicle Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Interest Rate (% per annum)<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="Auto-selected by loan type"
                type="number"
                value={form.interest_rate}
                readOnly
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                EMI (Monthly)
              </label>
              <input
                className="input-field"
                type="text"
                readOnly
                value={emiValue ? `Rs ${emiValue}` : ""}
                placeholder="Calculated automatically"
              />
            </div>
          </div>
        </section>

        {/* KYC Documents */}
        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
            KYC Documents
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Basic identity and address verification. Keep the latest documents handy while submitting the final application.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                PAN Number<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="ABCDE1234F"
                value={form.pan_number}
                onChange={(e) => updateField("pan_number", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                PAN File<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                type="file"
                className="input-field file-input-blue"
                onChange={(e) => setPanFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Aadhaar Number<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="12-digit Aadhaar"
                value={form.aadhaar_number}
                onChange={(e) => updateField("aadhaar_number", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Aadhaar File<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                type="file"
                className="input-field file-input-blue"
                onChange={(e) => setAadhaarFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
          </div>
        </section>

        {/* Income Documents */}
        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
            Income Details & Documents
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Provide your income information to help us assess eligibility.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Monthly Salary / Income<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. 50000"
                type="number"
                value={form.monthly_income}
                onChange={(e) => updateField("monthly_income", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Employer / Organisation<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                className="input-field"
                placeholder="Company / Institution name"
                value={form.employer_name}
                onChange={(e) => updateField("employer_name", e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Employment Type<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <select
                className="input-field"
                value={form.employment_type}
                onChange={(e) => {
                  updateField("employment_type", e.target.value);
                  setEmploymentDocuments({});
                }}
              >
                <option value="">Select</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Student">Student</option>
                <option value="Retired">Retired</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Income Tax Certificate<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                type="file"
                className="input-field file-input-blue"
                onChange={(e) => setIncomeTaxFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Tax Document<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                type="file"
                className="input-field file-input-blue"
                onChange={(e) => setTaxDocFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                Employment Proof<span style={{ color: "#e06d0a" }}> *</span>
              </label>
              <input
                type="file"
                className="input-field file-input-blue"
                onChange={(e) => setEmploymentProofFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
          </div>
        </section>

        {/* Employment Type Suggested Income Documents */}
        {form.employment_type && getEmploymentSpecificDocs().length > 0 && (
          <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
              {form.employment_type} - Suggested Income Documents
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
              Upload the relevant income documents based on your employment type.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {getEmploymentSpecificDocs().map((docType) => (
                <div key={docType}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                    {docType}<span style={{ color: "#e06d0a" }}> *</span>
                  </label>
                  <input
                    type="file"
                    className="input-field file-input-blue"
                    onChange={(e) => setEmploymentDocuments((prev) => ({ ...prev, [docType]: e.target.files?.[0] || null }))}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Loan Specific Documents */}
        {form.loan_purpose && getLoanSpecificDocs().length > 0 && (
          <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
                {form.loan_purpose} - Required Documents
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                Please upload the following documents for {form.loan_purpose}.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {getLoanSpecificDocs().map((docType) => (
                  <div key={docType}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
                      {docType}<span style={{ color: "#e06d0a" }}> *</span>
                    </label>
                    <input
                      type="file"
                      className="input-field file-input-blue"
                      onChange={(e) => setLoanDocuments(prev => ({ ...prev, [docType]: e.target.files?.[0] || null }))}
                    />
                  </div>
                ))}
              </div>
          </section>
        )}

        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#1a3f8f" }}>
            Agreement Confirmation<span style={{ color: "#e06d0a" }}> *</span>
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
            Confirm your agreement decision before saving draft or submitting.
          </div>
          <div
            style={{
              background: "rgba(26,95,196,0.08)",
              border: "1px solid rgba(26,95,196,0.2)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a3f8f", marginBottom: 6 }}>
              Terms & Policies
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
              <li>Provided details and documents must be correct and authentic.</li>
              <li>Application approval is subject to lender verification and policy checks.</li>
              <li>Interest rate, tenure, and EMI may change after underwriting review.</li>
              <li>Draft saves are for convenience and are not considered submitted applications.</li>
              <li>Final sanction terms will override any preliminary values shown here.</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#1f2a44" }}>
              <input
                type="radio"
                name="agreement_decision"
                checked={agreementDecision === "accepted"}
                onChange={() => setAgreementDecision("accepted")}
              />
              Accept Agreement
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#1f2a44" }}>
              <input
                type="radio"
                name="agreement_decision"
                checked={agreementDecision === "denied"}
                onChange={() => setAgreementDecision("denied")}
              />
              Deny Agreement
            </label>
          </div>
        </section>

        <section style={{ marginBottom: 20, background: "rgba(255,255,255,0.6)", padding: "20px", borderRadius: 12, border: "1px solid rgba(180,193,220,0.3)" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 4, display: "block" }}>
            Additional Notes<span style={{ color: "#e06d0a" }}> *</span>
          </label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Share any special requirements or clarifications for your loan."
            style={{ resize: "vertical" }}
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </section>

        {message && (
          <div className="link-row" style={{ color: "#e06d0a", marginTop: 8, marginBottom: 8 }}>
            {message}
          </div>
        )}

        {draftLoaded && !message && (
          <div className="link-row" style={{ color: "#1a5fc4", marginTop: 4, marginBottom: 8 }}>
            Draft loaded successfully. Continue and submit when ready.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10 }}>
          <button
            className="home-btn-blue"
            style={{ width: "auto", padding: "10px 18px" }}
            onClick={() => navigate("user-dashboard")}
          >
            Back
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="home-btn-blue"
              onClick={() => handleApply("draft")}
              disabled={loading}
              style={{ width: "auto", padding: "10px 16px", fontSize: 13 }}
            >
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button className="btn-blue" onClick={() => handleApply("submit")} disabled={loading} style={{ padding: "10px 24px", fontSize: 14, marginTop: 0 }}>
              {loading ? "Submitting..." : "Apply for Loan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

