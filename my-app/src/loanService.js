// Backward-compatible re-export from the new services location.
// Pages that import from "../loanService" will still work.
export {
  fetchAdminLoans,
  fetchAdminLoanDetail,
  updateAdminLoanStatus,
  fetchUserLoans,
  fetchUserLoanDetail,
  updateUserLoanContact,
  updateAdminDocumentStatus,
  reuploadRejectedDocument,
  submitLoanApplication,
  API_BASE_URL,
} from "./services/loanService";
