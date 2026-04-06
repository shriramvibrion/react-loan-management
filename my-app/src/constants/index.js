// Loan statuses
export const LOAN_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  DRAFT: "Draft",
};

// Loan purposes with interest rates
export const LOAN_PURPOSES = [
  { value: "Home Loan", rate: "8.50" },
  { value: "Education Loan", rate: "9.00" },
  { value: "Personal Loan", rate: "12.50" },
  { value: "Vehicle Loan", rate: "9.50" },
  { value: "Business Loan", rate: "13.00" },
  { value: "Other", rate: "11.00" },
];

// Employment types
export const EMPLOYMENT_TYPES = [
  "Salaried",
  "Self-Employed",
  "Student",
  "Retired",
  "Other",
];

// Tenure options (months)
export const TENURE_OPTIONS = [10, 12, 24, 36, 45];

// Loan-specific required documents by purpose
export const LOAN_SPECIFIC_DOCS = {
  "Home Loan": ["Land Document", "Approved Building Plan", "Property Registration"],
  "Education Loan": ["Bonafide Certificate", "Fee Structure", "Academic Records"],
  "Vehicle Loan": ["Proforma Invoice", "RC Copy"],
  "Business Loan": ["Business Registration Proof", "Bank Statements", "GST Certificate"],
};

// Employment-specific income documents
export const EMPLOYMENT_SPECIFIC_DOCS = {
  Salaried: ["Latest 3 Salary Slips", "Form 16", "Bank Statement (6 Months)"],
  "Self-Employed": ["ITR (Last 2 Years)", "Business Bank Statement", "Profit & Loss Statement", "GST Returns"],
  Student: ["Co-applicant Income Proof", "Sponsor Bank Statement"],
  Retired: ["Pension Statement", "Bank Statement (6 Months)"],
  Other: ["Income Source Proof", "Recent Bank Statement"],
};

// Allowed relationship options for related parties in loan application form
export const COAPPLICANT_RELATIONSHIP_OPTIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Guardian",
];

export const GUARANTOR_RELATIONSHIP_OPTIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Relative",
  "Friend",
  "Colleague",
  "Guardian",
];

// User roles
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
};

// Route paths
export const ROUTES = {
  HOME: "/",
  USER_LOGIN: "/user/login",
  USER_REGISTER: "/user/register",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_REGISTER: "/admin/register",
  DOCUMENTATION: "/documentation",
  USER_DASHBOARD: "/user/dashboard",
  USER_ANALYTICS: "/user/analytics",
  USER_LOAN_DETAIL: "/user/loan/:loanId",
  APPLY_LOAN: "/user/apply",
  EMI_CALCULATOR: "/user/emi-calculator",
  ELIGIBILITY_CHECKER: "/user/eligibility",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_LOAN_DETAIL: "/admin/loan/:loanId",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_USERS_LOANS: "/admin/users-loans",
};
