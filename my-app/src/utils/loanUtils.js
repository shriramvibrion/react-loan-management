import { LOAN_PURPOSES, LOAN_SPECIFIC_DOCS, EMPLOYMENT_SPECIFIC_DOCS } from "../constants";

/**
 * Calculate month difference between two dates.
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {number}
 */
export function monthDiff(fromDate, toDate) {
  const years = toDate.getFullYear() - fromDate.getFullYear();
  const months = toDate.getMonth() - fromDate.getMonth();
  return years * 12 + months;
}

/**
 * Normalize a loan object's status into a display bucket.
 * @param {object} loan
 * @returns {object} loan with `bucket` field
 */
export function normalizeLoan(loan) {
  const status = (loan.status || "").toLowerCase();
  let bucket = "Pending";
  if (status === "draft") bucket = "Draft";
  else if (status === "rejected") bucket = "Rejected";
  else if (status === "approved" || status === "accepted") bucket = "Accepted";
  return { ...loan, bucket };
}

/**
 * Get status badge styling.
 * @param {string} status
 * @returns {{ bg: string, color: string }}
 */
export function getStatusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "rejected") return { bg: "#f8d7da", color: "#721c24" };
  if (s === "approved" || s === "accepted") return { bg: "#d4edda", color: "#155724" };
  return { bg: "#fff3cd", color: "#856404" };
}

/**
 * Get interest rate by loan purpose.
 * @param {string} purpose
 * @returns {string} rate as string (e.g. "8.50")
 */
export function getInterestRateByPurpose(purpose) {
  const found = LOAN_PURPOSES.find((p) => p.value === purpose);
  return found ? found.rate : "";
}

/**
 * Calculate EMI.
 * @param {number} principal
 * @param {number} annualRate - annual interest rate percentage
 * @param {number} months - tenure in months
 * @returns {string|""} EMI value formatted to 2 decimals, or "" if invalid
 */
export function calculateEMI(principal, annualRate, months) {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return "";

  const monthlyRate = annualRate / (12 * 100);
  const powerTerm = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1);

  if (!Number.isFinite(emi)) return "";
  return emi.toFixed(2);
}

/**
 * Get loan-specific required documents by purpose.
 * @param {string} purpose
 * @returns {string[]}
 */
export function getLoanSpecificDocs(purpose) {
  return LOAN_SPECIFIC_DOCS[purpose] || [];
}

/**
 * Get employment-specific income documents.
 * @param {string} employmentType
 * @returns {string[]}
 */
export function getEmploymentSpecificDocs(employmentType) {
  return EMPLOYMENT_SPECIFIC_DOCS[employmentType] || [];
}

/**
 * Compute loan analytics data from raw loan data.
 * @param {object} loan - loan object with amount, tenure, applied_date, bucket
 * @returns {object} enriched loan with computed fields
 */
export function enrichLoanAnalytics(loan) {
  const now = new Date();
  const tenure = Number(loan.tenure || 0);
  const amount = Number(loan.loan_amount || 0);
  const applied = loan.applied_date ? new Date(loan.applied_date) : null;
  const elapsedRaw = applied ? monthDiff(applied, now) : 0;
  const elapsed = Math.max(0, elapsedRaw);
  const isAccepted = loan.bucket === "Accepted";

  const monthsCompleted = isAccepted ? Math.min(tenure, elapsed) : 0;
  const remainingMonths = Math.max(0, tenure - monthsCompleted);
  const amountPaid = tenure > 0 ? amount * (monthsCompleted / tenure) : 0;
  const amountRemaining = Math.max(0, amount - amountPaid);
  const paidPercent = amount > 0 ? Math.round((amountPaid / amount) * 100) : 0;
  const monthCompletedPercent = tenure > 0 ? Math.round((monthsCompleted / tenure) * 100) : 0;

  return {
    ...loan,
    tenure,
    amount,
    monthsCompleted,
    remainingMonths,
    amountPaid,
    amountRemaining,
    paidPercent,
    monthCompletedPercent,
  };
}
