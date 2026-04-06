import { useState, useCallback, useMemo, useEffect } from "react";
import {
  calculateEMI,
  getInterestRateByPurpose,
  getLoanSpecificDocs,
  getEmploymentSpecificDocs,
} from "../utils/loanUtils";
import { isValidEmail, isValidPhone, isValidPAN, isValidAadhaar, isValidPostalCode } from "../utils/validators";
import { COAPPLICANT_RELATIONSHIP_OPTIONS, GUARANTOR_RELATIONSHIP_OPTIONS } from "../constants";

const DRAFT_KEY = "ezl_apply_draft";
const MAX_RELATED_PARTIES = 3;
const COAPPLICANT_RELATIONSHIP_SET = new Set(COAPPLICANT_RELATIONSHIP_OPTIONS);
const GUARANTOR_RELATIONSHIP_SET = new Set(GUARANTOR_RELATIONSHIP_OPTIONS);
const APPLICANT_AADHAAR_FRONT_LABEL = "Applicant Aadhaar Front";
const APPLICANT_AADHAAR_BACK_LABEL = "Applicant Aadhaar Back";
const APPLICANT_PAN_FRONT_LABEL = "Applicant PAN Front";
const APPLICANT_PAN_BACK_LABEL = "Applicant PAN Back";

const createRelatedParty = () => ({
  full_name: "",
  contact_email: "",
  primary_mobile: "",
  dob: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  pan_number: "",
  aadhaar_number: "",
  monthly_income: "",
  employer_name: "",
  employment_type: "",
  relationship: "",
});

const getRelatedDocLabel = (type, index, docType) => `${type} ${index + 1} ${docType}`;
const getRelatedIncomeDocLabel = (type, index, docType) => `${type} ${index + 1} Income - ${docType}`;

const getRelatedKycDocLabels = (type, index) => ({
  panFront: getRelatedDocLabel(type, index, "PAN Front"),
  panBack: getRelatedDocLabel(type, index, "PAN Back"),
  aadhaarFront: getRelatedDocLabel(type, index, "Aadhaar Front"),
  aadhaarBack: getRelatedDocLabel(type, index, "Aadhaar Back"),
});

const getRelatedIncomeDocLabelsForParty = (party, type, index) => {
  const employmentType = party?.employment_type || "";
  const incomeDocTypes = getEmploymentSpecificDocs(employmentType);
  return incomeDocTypes.map((docType) => getRelatedIncomeDocLabel(type, index, docType));
};

const isJpgOrPngFile = (file) => {
  if (!file || !file.name) return false;
  const fileName = file.name.toLowerCase();
  return fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png");
};

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
  cibil_score: "",
  employer_name: "",
  coapplicants: [createRelatedParty()],
  guarantors: [createRelatedParty()],
  agreement: "",
  parent_name: "",
  parent_occupation: "",
  parent_annual_income: "",
};

function loadDraft(email) {
  try {
    if (!email) return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Restore only drafts explicitly tagged for the current user.
    // Older drafts without owner metadata are ignored to avoid cross-user leakage.
    if (parsed._draftOwner !== email) return null;

    const { _draftOwner, ...formData } = parsed;
    return formData;
  } catch {
    return null;
  }
}

/**
 * Custom hook encapsulating all loan application form logic:
 * form state, file state, auto-calculations, draft save/load, and validation.
 */
export default function useLoanForm(userEmail) {
  const [form, setForm] = useState(() => INITIAL_FORM);
  const [files, setFiles] = useState({});

  useEffect(() => {
    setForm(INITIAL_FORM);
    setFiles({});
  }, [userEmail]);

  useEffect(() => {
    const ensureRelatedDefaults = (list) => {
      if (!Array.isArray(list) || list.length === 0) return [createRelatedParty()];
      return list.slice(0, MAX_RELATED_PARTIES).map((item) => ({
        ...createRelatedParty(),
        ...(item || {}),
        full_name: item?.full_name ?? item?.name ?? "",
        primary_mobile: item?.primary_mobile ?? item?.mobile ?? "",
        contact_email: item?.contact_email ?? item?.email ?? "",
        monthly_income: item?.monthly_income ?? item?.annual_income ?? "",
      }));
    };

    setForm((prev) => {
      const normalizedCo = ensureRelatedDefaults(prev.coapplicants);
      const normalizedGu = ensureRelatedDefaults(prev.guarantors);
      const coSame = JSON.stringify(prev.coapplicants) === JSON.stringify(normalizedCo);
      const guSame = JSON.stringify(prev.guarantors) === JSON.stringify(normalizedGu);
      if (coSame && guSame) return prev;
      return {
        ...prev,
        coapplicants: normalizedCo,
        guarantors: normalizedGu,
      };
    });
  }, []);

  // Auto-save draft to localStorage (tagged with owner email)
  useEffect(() => {
    try {
      const serialized = { ...form, _draftOwner: userEmail || "" };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serialized));
    } catch { /* ignore */ }
  }, [form, userEmail]);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateRelatedPartyField = useCallback((group, index, key, value) => {
    setForm((prev) => {
      const list = Array.isArray(prev[group]) ? [...prev[group]] : [createRelatedParty()];
      if (index < 0 || index >= list.length) return prev;
      list[index] = { ...list[index], [key]: value };
      return { ...prev, [group]: list };
    });
  }, []);

  const addRelatedParty = useCallback((group) => {
    setForm((prev) => {
      const list = Array.isArray(prev[group]) ? prev[group] : [createRelatedParty()];
      if (list.length >= MAX_RELATED_PARTIES) return prev;
      return { ...prev, [group]: [...list, createRelatedParty()] };
    });
  }, []);

  const removeRelatedParty = useCallback((group) => {
    let removedIndex = -1;
    let removedType = "";
    let removedParty = null;

    setForm((prev) => {
      const list = Array.isArray(prev[group]) ? [...prev[group]] : [createRelatedParty()];
      if (list.length <= 1) return prev;
      removedIndex = list.length - 1;
      removedType = group === "coapplicants" ? "Co-applicant" : "Guarantor";
      removedParty = list[list.length - 1] || null;
      list.pop();
      return { ...prev, [group]: list };
    });

    if (removedIndex >= 1 && removedType) {
      const kycDocs = getRelatedKycDocLabels(removedType, removedIndex);
      const incomeDocs = getRelatedIncomeDocLabelsForParty(removedParty, removedType, removedIndex);
      setFiles((prev) => {
        const updated = { ...prev };
        delete updated[kycDocs.panFront];
        delete updated[kycDocs.panBack];
        delete updated[kycDocs.aadhaarFront];
        delete updated[kycDocs.aadhaarBack];
        for (const incomeDoc of incomeDocs) {
          delete updated[incomeDoc];
        }
        return updated;
      });
    }
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

  // Auto-set employment type to "Student" when loan purpose is Education Loan
  useEffect(() => {
    if (form.loan_purpose === "Education Loan" && form.employment_type !== "Student") {
      setForm((prev) => ({ ...prev, employment_type: "Student" }));
    }
  }, [form.loan_purpose, form.employment_type]);

  // Reset employment type if "Student" is selected but loan purpose is not Education Loan
  useEffect(() => {
    if (form.employment_type === "Student" && form.loan_purpose !== "Education Loan") {
      setForm((prev) => ({ ...prev, employment_type: "" }));
    }
  }, [form.loan_purpose, form.employment_type]);

  // Clear parent income fields when loan purpose is not Education Loan
  useEffect(() => {
    if (form.loan_purpose !== "Education Loan") {
      setForm((prev) => ({
        ...prev,
        parent_name: "",
        parent_occupation: "",
        parent_annual_income: "",
      }));
    }
  }, [form.loan_purpose]);

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
    const file = e.target.files?.[0] || null;
    if (file) {
      setFiles((prev) => ({ ...prev, [docType]: file }));
    } else {
      // User cancelled or cleared the file — remove stale entry
      setFiles((prev) => {
        const updated = { ...prev };
        delete updated[docType];
        return updated;
      });
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

  const coapplicantIncomeDocs = useMemo(() => {
    const coapplicants = Array.isArray(form.coapplicants) ? form.coapplicants : [];
    return coapplicants.map((party, index) => ({
      employmentType: party?.employment_type || "",
      docs: getRelatedIncomeDocLabelsForParty(party, "Co-applicant", index),
    }));
  }, [form.coapplicants]);

  const guarantorIncomeDocs = useMemo(() => {
    const guarantors = Array.isArray(form.guarantors) ? form.guarantors : [];
    return guarantors.map((party, index) => ({
      employmentType: party?.employment_type || "",
      docs: getRelatedIncomeDocLabelsForParty(party, "Guarantor", index),
    }));
  }, [form.guarantors]);

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
      "pan_number", "aadhaar_number", "monthly_income", "cibil_score", "employer_name",
    ];

    // Student Education Loan requires parent income details
    if (form.loan_purpose === "Education Loan") {
      if (!form.parent_name || !form.parent_occupation || !form.parent_annual_income) {
        return { valid: false, message: "Parent income details are required for Education Loan applications." };
      }
      const parentIncome = parseFloat(form.parent_annual_income);
      if (isNaN(parentIncome) || parentIncome <= 0) {
        return { valid: false, message: "Parent annual income must be a positive number." };
      }
    }
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
    const cibil = parseInt(form.cibil_score, 10);
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: "Loan amount must be a positive number." };
    }
    if (isNaN(income) || income <= 0) {
      return { valid: false, message: "Monthly income must be a positive number." };
    }
    if (isNaN(cibil) || cibil < 300 || cibil > 900) {
      return { valid: false, message: "CIBIL score must be between 300 and 900." };
    }

    const applicantKycRequiredFiles = [
      APPLICANT_AADHAAR_FRONT_LABEL,
      APPLICANT_AADHAAR_BACK_LABEL,
      APPLICANT_PAN_FRONT_LABEL,
      APPLICANT_PAN_BACK_LABEL,
    ];

    for (const label of applicantKycRequiredFiles) {
      if (!files[label]) {
        return { valid: false, message: "Please upload Applicant Aadhaar and PAN front/back images." };
      }
      if (!isJpgOrPngFile(files[label])) {
        return { valid: false, message: `File for '${label}' must be JPG or PNG.` };
      }
    }

    const coapplicants = Array.isArray(form.coapplicants) ? form.coapplicants : [];
    const guarantors = Array.isArray(form.guarantors) ? form.guarantors : [];

    if (coapplicants.length === 0 || guarantors.length === 0) {
      return { valid: false, message: "At least one co-applicant and one guarantor are required." };
    }

    for (let i = 0; i < coapplicants.length; i += 1) {
      const item = coapplicants[i] || createRelatedParty();
      const requiredRelatedFields = [
        "full_name",
        "primary_mobile",
        "dob",
        "address_line1",
        "city",
        "state",
        "postal_code",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "employment_type",
        "relationship",
      ];
      if (requiredRelatedFields.some((field) => !item[field])) {
        return { valid: false, message: `Please complete all details for Co-applicant ${i + 1}.` };
      }
      if (item.contact_email && !isValidEmail(item.contact_email)) {
        return { valid: false, message: `Please enter a valid email for Co-applicant ${i + 1}.` };
      }
      if (!isValidPhone(item.primary_mobile)) {
        return { valid: false, message: `Co-applicant ${i + 1} mobile must be a valid 10-digit Indian number.` };
      }
      if (!COAPPLICANT_RELATIONSHIP_SET.has(item.relationship)) {
        return { valid: false, message: `Please select a valid relationship for Co-applicant ${i + 1}.` };
      }
      if (!isValidPostalCode(item.postal_code)) {
        return { valid: false, message: `Co-applicant ${i + 1} postal code must be exactly 6 digits.` };
      }
      if (!isValidPAN(item.pan_number)) {
        return { valid: false, message: `Co-applicant ${i + 1} PAN must be in format ABCDE1234F.` };
      }
      if (!isValidAadhaar(item.aadhaar_number)) {
        return { valid: false, message: `Co-applicant ${i + 1} Aadhaar must be exactly 12 digits.` };
      }
      const monthlyIncome = parseFloat(item.monthly_income);
      if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
        return { valid: false, message: `Co-applicant ${i + 1} monthly income must be a positive number.` };
      }
      const kycDocs = getRelatedKycDocLabels("Co-applicant", i);
      if (!files[kycDocs.panFront] || !files[kycDocs.panBack] || !files[kycDocs.aadhaarFront] || !files[kycDocs.aadhaarBack]) {
        return { valid: false, message: `Please upload PAN front/back and Aadhaar front/back for Co-applicant ${i + 1}.` };
      }

      const incomeDocLabels = getRelatedIncomeDocLabelsForParty(item, "Co-applicant", i);
      if (incomeDocLabels.length === 0) {
        return { valid: false, message: `Please select employment type for Co-applicant ${i + 1}.` };
      }
      for (const incomeDocLabel of incomeDocLabels) {
        if (!files[incomeDocLabel]) {
          return { valid: false, message: `Please upload all income documents for Co-applicant ${i + 1}.` };
        }
      }
    }

    for (let i = 0; i < guarantors.length; i += 1) {
      const item = guarantors[i] || createRelatedParty();
      const requiredRelatedFields = [
        "full_name",
        "primary_mobile",
        "dob",
        "address_line1",
        "city",
        "state",
        "postal_code",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "employment_type",
        "relationship",
      ];
      if (requiredRelatedFields.some((field) => !item[field])) {
        return { valid: false, message: `Please complete all details for Guarantor ${i + 1}.` };
      }
      if (item.contact_email && !isValidEmail(item.contact_email)) {
        return { valid: false, message: `Please enter a valid email for Guarantor ${i + 1}.` };
      }
      if (!isValidPhone(item.primary_mobile)) {
        return { valid: false, message: `Guarantor ${i + 1} mobile must be a valid 10-digit Indian number.` };
      }
      if (!GUARANTOR_RELATIONSHIP_SET.has(item.relationship)) {
        return { valid: false, message: `Please select a valid relationship for Guarantor ${i + 1}.` };
      }
      if (!isValidPostalCode(item.postal_code)) {
        return { valid: false, message: `Guarantor ${i + 1} postal code must be exactly 6 digits.` };
      }
      if (!isValidPAN(item.pan_number)) {
        return { valid: false, message: `Guarantor ${i + 1} PAN must be in format ABCDE1234F.` };
      }
      if (!isValidAadhaar(item.aadhaar_number)) {
        return { valid: false, message: `Guarantor ${i + 1} Aadhaar must be exactly 12 digits.` };
      }
      const monthlyIncome = parseFloat(item.monthly_income);
      if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
        return { valid: false, message: `Guarantor ${i + 1} monthly income must be a positive number.` };
      }
      const kycDocs = getRelatedKycDocLabels("Guarantor", i);
      if (!files[kycDocs.panFront] || !files[kycDocs.panBack] || !files[kycDocs.aadhaarFront] || !files[kycDocs.aadhaarBack]) {
        return { valid: false, message: `Please upload PAN front/back and Aadhaar front/back for Guarantor ${i + 1}.` };
      }

      const incomeDocLabels = getRelatedIncomeDocLabelsForParty(item, "Guarantor", i);
      if (incomeDocLabels.length === 0) {
        return { valid: false, message: `Please select employment type for Guarantor ${i + 1}.` };
      }
      for (const incomeDocLabel of incomeDocLabels) {
        if (!files[incomeDocLabel]) {
          return { valid: false, message: `Please upload all income documents for Guarantor ${i + 1}.` };
        }
      }
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

      const coapplicants = Array.isArray(form.coapplicants) ? form.coapplicants : [];
      const guarantors = Array.isArray(form.guarantors) ? form.guarantors : [];
      const primaryCoapplicant = coapplicants[0] || createRelatedParty();
      const primaryGuarantor = guarantors[0] || createRelatedParty();

      // Append all text form fields
      const textFields = [
        "full_name", "contact_email", "primary_mobile", "alternate_mobile",
        "dob", "address_line1", "address_line2", "city", "state", "postal_code",
        "pan_number", "aadhaar_number", "loan_amount", "tenure", "loan_purpose",
        "interest_rate", "emi", "employment_type", "monthly_income",
        "cibil_score", "employer_name",
        "parent_name", "parent_occupation",
        "parent_annual_income",
      ];
      for (const key of textFields) {
        if (form[key] !== undefined && form[key] !== null && form[key] !== "") {
          fd.append(key, form[key]);
        }
      }

      fd.append("coapplicant_name", primaryCoapplicant.full_name || primaryCoapplicant.name || "");
      fd.append("coapplicant_relationship", primaryCoapplicant.relationship || "");
      fd.append("coapplicant_mobile", primaryCoapplicant.primary_mobile || primaryCoapplicant.mobile || "");
      fd.append("coapplicant_annual_income", primaryCoapplicant.monthly_income ? String(Number(primaryCoapplicant.monthly_income) * 12) : (primaryCoapplicant.annual_income || ""));
      fd.append("coapplicant_pan_number", primaryCoapplicant.pan_number || "");
      fd.append("coapplicant_aadhaar_number", primaryCoapplicant.aadhaar_number || "");
      fd.append("guarantor_name", primaryGuarantor.full_name || primaryGuarantor.name || "");
      fd.append("guarantor_relationship", primaryGuarantor.relationship || "");
      fd.append("guarantor_mobile", primaryGuarantor.primary_mobile || primaryGuarantor.mobile || "");
      fd.append("guarantor_annual_income", primaryGuarantor.monthly_income ? String(Number(primaryGuarantor.monthly_income) * 12) : (primaryGuarantor.annual_income || ""));
      fd.append("guarantor_pan_number", primaryGuarantor.pan_number || "");
      fd.append("guarantor_aadhaar_number", primaryGuarantor.aadhaar_number || "");
      fd.append("coapplicants_json", JSON.stringify(coapplicants));
      fd.append("guarantors_json", JSON.stringify(guarantors));

      // Core named document uploads
      if (files[APPLICANT_PAN_FRONT_LABEL]) {
        fd.append("pan_file", files[APPLICANT_PAN_FRONT_LABEL]);
      }
      if (files[APPLICANT_AADHAAR_FRONT_LABEL]) {
        fd.append("aadhaar_file", files[APPLICANT_AADHAAR_FRONT_LABEL]);
      }

      // Dynamic loan-specific and employment-specific documents
      // Backend expects "document_types[]" and "document_files[]"
      const dynamicDocLabels = [
        ...loanSpecificDocs,
        ...incomeDocs.map((d) => `Income - ${d}`),
        ...coapplicants.flatMap((_, index) => {
          const kycDocs = getRelatedKycDocLabels("Co-applicant", index);
          return [
            kycDocs.panFront,
            kycDocs.panBack,
            kycDocs.aadhaarFront,
            kycDocs.aadhaarBack,
          ];
        }),
        ...coapplicants.flatMap((party, index) => (
          getRelatedIncomeDocLabelsForParty(party, "Co-applicant", index)
        )),
        ...guarantors.flatMap((_, index) => {
          const kycDocs = getRelatedKycDocLabels("Guarantor", index);
          return [
            kycDocs.panFront,
            kycDocs.panBack,
            kycDocs.aadhaarFront,
            kycDocs.aadhaarBack,
          ];
        }),
        ...guarantors.flatMap((party, index) => (
          getRelatedIncomeDocLabelsForParty(party, "Guarantor", index)
        )),
        APPLICANT_PAN_BACK_LABEL,
        APPLICANT_AADHAAR_BACK_LABEL,
      ];
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
    const normalizeRelatedParty = (item) => ({
      ...createRelatedParty(),
      ...(item || {}),
      full_name: item?.full_name || item?.name || "",
      contact_email: item?.contact_email || item?.email || "",
      primary_mobile: item?.primary_mobile || item?.mobile || "",
      dob: item?.dob || "",
      address_line1: item?.address_line1 || "",
      address_line2: item?.address_line2 || "",
      city: item?.city || "",
      state: item?.state || "",
      postal_code: item?.postal_code || "",
      pan_number: item?.pan_number || "",
      aadhaar_number: item?.aadhaar_number || "",
      monthly_income: item?.monthly_income != null
        ? String(item.monthly_income)
        : item?.annual_income != null
          ? String(item.annual_income)
          : "",
      employer_name: item?.employer_name || "",
      employment_type: item?.employment_type || "",
      relationship: item?.relationship || "",
    });

    const parseRelatedPeople = (rawJson, fallback) => {
      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, MAX_RELATED_PARTIES).map((item) => normalizeRelatedParty(item));
          }
        } catch {
          // no-op
        }
      }
      return fallback;
    };

    const fallbackCoapplicants = applicant?.coapplicant_name
      ? [{
        full_name: applicant.coapplicant_name || "",
        relationship: applicant.coapplicant_relationship || "",
        primary_mobile: applicant.coapplicant_mobile || "",
        monthly_income: applicant?.coapplicant_annual_income ? String(applicant.coapplicant_annual_income) : "",
        pan_number: applicant?.coapplicant_pan_number || "",
        aadhaar_number: applicant?.coapplicant_aadhaar_number || "",
      }].map((item) => normalizeRelatedParty(item))
      : [createRelatedParty()];

    const fallbackGuarantors = applicant?.guarantor_name
      ? [{
        full_name: applicant.guarantor_name || "",
        relationship: applicant.guarantor_relationship || "",
        primary_mobile: applicant.guarantor_mobile || "",
        monthly_income: applicant?.guarantor_annual_income ? String(applicant.guarantor_annual_income) : "",
        pan_number: applicant?.guarantor_pan_number || "",
        aadhaar_number: applicant?.guarantor_aadhaar_number || "",
      }].map((item) => normalizeRelatedParty(item))
      : [createRelatedParty()];

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
      cibil_score: applicant?.cibil_score != null ? String(applicant.cibil_score) : "",
      employer_name: applicant?.employer_name || "",
      coapplicants: parseRelatedPeople(applicant?.coapplicants_json, fallbackCoapplicants),
      guarantors: parseRelatedPeople(applicant?.guarantors_json, fallbackGuarantors),
      agreement: "",
      parent_name: applicant?.parent_name || "",
      parent_occupation: applicant?.parent_occupation || "",
      parent_annual_income: applicant?.parent_annual_income ? String(applicant.parent_annual_income) : "",
    });
    // Clear file state — user must re-upload files for a draft
    setFiles({});
  }, []);

  return {
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
    saveDraft,
    clearDraft,
    validate,
    buildFormData,
    loadFromServer,
    setForm,
  };
}
