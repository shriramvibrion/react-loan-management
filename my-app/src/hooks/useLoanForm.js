import { useState, useCallback, useMemo, useEffect } from "react";
import {
  calculateEMI,
  getInterestRateByPurpose,
  getLoanSpecificDocs,
  getEmploymentSpecificDocs,
} from "../utils/loanUtils";
import { isValidEmail, isValidPhone, isValidPAN, isValidAadhaar, isValidPostalCode } from "../utils/validators";

const DRAFT_KEY = "ezl_apply_draft";

const INITIAL_FORM = {
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
  pan_number: "",
  aadhaar_number: "",
  loan_amount: "",
  tenure: "",
  loan_purpose: "",
  interest_rate: "",
  emi: "",
  employment_type: "",
  monthly_income: "",
  employer_name: "",
  agreement: "",
  notes: "",
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Custom hook encapsulating all loan application form logic:
 * form state, file state, auto-calculations, draft save/load, and validation.
 */
export default function useLoanForm() {
  const [form, setForm] = useState(() => loadDraft() || INITIAL_FORM);
  const [files, setFiles] = useState({});

  // Auto-save draft to localStorage
  useEffect(() => {
    try {
      const serialized = { ...form };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serialized));
    } catch { /* ignore */ }
  }, [form]);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Auto-set interest rate when loan purpose changes
  useEffect(() => {
    if (form.loan_purpose) {
      const rate = getInterestRateByPurpose(form.loan_purpose);
      if (rate && rate !== form.interest_rate) {
        setForm((prev) => ({ ...prev, interest_rate: rate }));
      }
    }
  }, [form.loan_purpose, form.interest_rate]);

  // Reset employment type if "Student" is selected but loan purpose is not Education Loan
  useEffect(() => {
    if (form.employment_type === "Student" && form.loan_purpose !== "Education Loan") {
      setForm((prev) => ({ ...prev, employment_type: "" }));
    }
  }, [form.loan_purpose, form.employment_type]);

  // Auto-calc EMI
  useEffect(() => {
    const amount = parseFloat(form.loan_amount);
    const rate = parseFloat(form.interest_rate);
    const tenure = parseInt(form.tenure, 10);
    if (amount > 0 && rate > 0 && tenure > 0) {
      const emiVal = calculateEMI(amount, rate, tenure);
      if (emiVal && emiVal !== form.emi) {
        setForm((prev) => ({ ...prev, emi: emiVal }));
      }
    }
  }, [form.loan_amount, form.interest_rate, form.tenure, form.emi]);

  const handleFileChange = useCallback((docType, e) => {
    if (e.target.files?.[0]) {
      setFiles((prev) => ({ ...prev, [docType]: e.target.files[0] }));
    }
  }, []);

  const loanSpecificDocs = useMemo(
    () => getLoanSpecificDocs(form.loan_purpose),
    [form.loan_purpose]
  );

  const incomeDocs = useMemo(
    () => getEmploymentSpecificDocs(form.employment_type),
    [form.employment_type]
  );

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch { /* ignore */ }
  }, [form]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, []);

  const validate = useCallback(() => {
    const requiredFields = [
      "full_name", "contact_email", "primary_mobile", "dob",
      "address_line1", "address_line2", "city", "state", "postal_code",
      "loan_amount", "tenure", "loan_purpose", "employment_type",
      "pan_number", "aadhaar_number", "monthly_income", "employer_name",
      "notes",
    ];
    for (const field of requiredFields) {
      if (!form[field]) {
        return { valid: false, message: "Please fill in all mandatory fields before submitting." };
      }
    }

    if (!isValidEmail(form.contact_email)) {
      return { valid: false, message: "Please enter a valid email address." };
    }
    if (!isValidPhone(form.primary_mobile)) {
      return { valid: false, message: "Primary mobile must be a valid 10-digit Indian number." };
    }
    if (form.alternate_mobile && !isValidPhone(form.alternate_mobile)) {
      return { valid: false, message: "Alternate mobile must be a valid 10-digit Indian number." };
    }
    if (!isValidPAN(form.pan_number)) {
      return { valid: false, message: "PAN must be in format ABCDE1234F." };
    }
    if (!isValidAadhaar(form.aadhaar_number)) {
      return { valid: false, message: "Aadhaar must be exactly 12 digits." };
    }
    if (!isValidPostalCode(form.postal_code)) {
      return { valid: false, message: "Postal code must be exactly 6 digits." };
    }

    const amount = parseFloat(form.loan_amount);
    const income = parseFloat(form.monthly_income);
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: "Loan amount must be a positive number." };
    }
    if (isNaN(income) || income <= 0) {
      return { valid: false, message: "Monthly income must be a positive number." };
    }

    if (!files["pan_file"] || !files["aadhaar_file"]) {
      return { valid: false, message: "Please upload PAN and Aadhaar files." };
    }

    if (form.agreement !== "accept") {
      return { valid: false, message: "You must accept the terms and policies to proceed." };
    }

    return { valid: true, message: "" };
  }, [form, files]);

  /**
   * Build FormData for submission, mapping files correctly for the backend.
   */
  const buildFormData = useCallback(
    (email, isDraft = false) => {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("submission_type", isDraft ? "draft" : "submit");
      fd.append("agreement_decision", form.agreement === "accept" ? "accepted" : "denied");

      // Append all text form fields
      const textFields = [
        "full_name", "contact_email", "primary_mobile", "alternate_mobile",
        "dob", "address_line1", "address_line2", "city", "state", "postal_code",
        "pan_number", "aadhaar_number", "loan_amount", "tenure", "loan_purpose",
        "interest_rate", "emi", "employment_type", "monthly_income",
        "employer_name", "notes",
      ];
      for (const key of textFields) {
        if (form[key] !== undefined && form[key] !== null && form[key] !== "") {
          fd.append(key, form[key]);
        }
      }

      // Core named document uploads
      const coreFileKeys = [
        "pan_file", "aadhaar_file", "income_tax_certificate",
        "tax_document", "employment_proof",
      ];
      for (const key of coreFileKeys) {
        if (files[key]) {
          fd.append(key, files[key]);
        }
      }

      // Dynamic loan-specific and employment-specific documents
      // Backend expects "document_types[]" and "document_files[]"
      const dynamicDocLabels = [...loanSpecificDocs, ...incomeDocs.map((d) => `Income - ${d}`)];
      for (const label of dynamicDocLabels) {
        const file = files[label];
        if (file) {
          fd.append("document_types[]", label);
          fd.append("document_files[]", file);
        }
      }

      return fd;
    },
    [form, files, loanSpecificDocs, incomeDocs]
  );

  /**
   * Populate form from server-side loan data (e.g. resuming a draft).
   */
  const loadFromServer = useCallback((loan, applicant) => {
    setForm({
      full_name: applicant?.full_name || "",
      contact_email: applicant?.contact_email || "",
      primary_mobile: applicant?.primary_mobile || "",
      alternate_mobile: applicant?.alternate_mobile || "",
      dob: applicant?.dob || "",
      address_line1: applicant?.address_line1 || "",
      address_line2: applicant?.address_line2 || "",
      city: applicant?.city || "",
      state: applicant?.state || "",
      postal_code: applicant?.postal_code || "",
      pan_number: applicant?.pan_number || "",
      aadhaar_number: applicant?.aadhaar_number || "",
      loan_amount: loan?.loan_amount ? String(loan.loan_amount) : "",
      tenure: loan?.tenure ? String(loan.tenure) : "",
      loan_purpose: applicant?.loan_purpose || "",
      interest_rate: loan?.interest_rate ? String(loan.interest_rate) : "",
      emi: loan?.emi ? String(loan.emi) : "",
      employment_type: applicant?.employment_type || "",
      monthly_income: applicant?.monthly_income ? String(applicant.monthly_income) : "",
      employer_name: applicant?.employer_name || "",
      agreement: "",
      notes: applicant?.notes || "",
    });
    // Clear file state — user must re-upload files for a draft
    setFiles({});
  }, []);

  return {
    form,
    files,
    updateField,
    handleFileChange,
    loanSpecificDocs,
    incomeDocs,
    saveDraft,
    clearDraft,
    validate,
    buildFormData,
    loadFromServer,
    setForm,
  };
}
