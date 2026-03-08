import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { submitLoanApplication } from "../services/loanService";
import {
  calculateEMI,
  getInterestRateByPurpose,
  getLoanSpecificDocs,
  getEmploymentSpecificDocs,
} from "../utils/loanUtils";

const DRAFT_KEY = "ezl_apply_draft";

function saveDraft(data) {
  try {
    const serialized = { ...data };
    delete serialized.files;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serialized));
  } catch { /* ignore */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export function useLoanForm(userEmail) {
  const navigate = useNavigate();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(() => {
    const draft = loadDraft();
    return (
      draft || {
        full_name: "", contact_email: "", primary_mobile: "",
        alternate_mobile: "", dob: "", address_line1: "",
        address_line2: "", city: "", state: "", postal_code: "",
        pan_number: "", aadhaar_number: "", loan_amount: "",
        tenure: "", loan_purpose: "", interest_rate: "", emi: "",
        employment_type: "", monthly_income: "", employer_name: "",
        agreement: "", notes: "",
      }
    );
  });

  const [files, setFiles] = useState({});

  useEffect(() => {
    saveDraft(form);
  }, [form]);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (form.loan_purpose) {
      const rate = getInterestRateByPurpose(form.loan_purpose);
      if (rate && rate !== form.interest_rate) {
        updateField("interest_rate", rate);
      }
    }
  }, [form.loan_purpose, form.interest_rate, updateField]);

  useEffect(() => {
    const amount = parseFloat(form.loan_amount);
    const rate = parseFloat(form.interest_rate);
    const tenure = parseInt(form.tenure, 10);
    if (amount > 0 && rate > 0 && tenure > 0) {
      const emiVal = calculateEMI(amount, rate, tenure);
      if (emiVal && emiVal !== form.emi) {
        updateField("emi", emiVal);
      }
    }
  }, [form.loan_amount, form.interest_rate, form.tenure, form.emi, updateField]);

  const handleFileChange = (docType, e) => {
    if (e.target.files?.[0]) {
      setFiles((prev) => ({ ...prev, [docType]: e.target.files[0] }));
    }
  };

  const handleSaveDraft = () => {
    saveDraft(form);
    toast.success("Draft saved successfully!");
  };

  const validateForm = () => {
    const requiredFields = [
      "full_name", "contact_email", "primary_mobile", "dob",
      "address_line1", "city", "state", "postal_code",
      "loan_amount", "tenure", "loan_purpose", "employment_type",
      "pan_number", "aadhaar_number", "monthly_income", "employer_name"
    ];
    for (const field of requiredFields) {
      if (!form[field]) {
        toast.warning("Please fill in all mandatory fields before submitting.");
        return false;
      }
    }
    if (!files["pan_file"] || !files["aadhaar_file"]) {
      toast.warning("Please upload PAN and Aadhaar files.");
      return false;
    }
    if (form.agreement !== "accept") {
      toast.warning("You must accept the terms and policies to proceed.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("email", userEmail);

      Object.entries(form).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          fd.append(key, val);
        }
      });

      Object.entries(files).forEach(([docType, file]) => {
        fd.append("documents", file);
        fd.append("document_types", docType);
      });

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

  const loanSpecificDocs = getLoanSpecificDocs(form.loan_purpose);
  const incomeDocs = getEmploymentSpecificDocs(form.employment_type);

  return {
    form,
    files,
    submitting,
    message,
    updateField,
    handleFileChange,
    handleSaveDraft,
    handleSubmit,
    loanSpecificDocs,
    incomeDocs
  };
}
