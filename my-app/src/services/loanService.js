import api, { API_BASE_URL } from "../api";

export async function fetchAdminLoans() {
  const data = await api.get("/api/admin/loans");
  return data.loans || [];
}

export async function fetchAdminLoanDetail(loanId) {
  return api.get(`/api/admin/loans/${loanId}`);
}

export async function updateAdminLoanStatus(loanId, status, adminEmail = "", remarks = "") {
  return api.patch(`/api/admin/loans/${loanId}/status`, { status, admin_email: adminEmail, remarks });
}

export async function updateAdminDocumentStatus(
  documentId,
  status,
  adminEmail = "",
  message = "",
  verification = {}
) {
  return api.patch(`/api/admin/documents/${documentId}/status`, {
    status,
    admin_email: adminEmail,
    message,
    front_verified: Boolean(verification.front_verified),
    back_verified: Boolean(verification.back_verified),
    is_fully_verified: Boolean(verification.is_fully_verified),
  });
}

export async function sendAdminLoanEmail(loanId, adminEmail = "", message = "") {
  return api.post(`/api/admin/loans/${loanId}/send-email`, { admin_email: adminEmail, message });
}

export async function sendAdminNotification(loanId, message, adminEmail = "") {
  return api.post(`/api/admin/loans/${loanId}/notify`, { admin_email: adminEmail, message });
}

export async function fetchAdminUsersLoans(params = {}) {
  const query = new URLSearchParams({
    q: params.q || "",
    status: params.status || "all",
    page: String(params.page || 1),
    page_size: String(params.pageSize || 10),
  });
  return api.get(`/api/admin/users-loans?${query.toString()}`);
}

export async function fetchUserLoans(email, params = {}) {
  const query = new URLSearchParams({
    email: email || "",
    page: String(params.page || 1),
    limit: String(params.limit || 10),
    status: params.status || "all",
  });

  const data = await api.get(`/api/user/loans?${query.toString()}`);

  if (params.rawResponse) {
    return data;
  }

  return data.loans || [];
}

export async function fetchUserLoanDetail(loanId, email) {
  const t = Date.now();
  return api.get(`/api/user/loans/${loanId}?email=${encodeURIComponent(email || "")}&t=${t}`);
}

export async function reuploadRejectedDocument(documentId, email, file) {
  const formData = new FormData();
  formData.append("email", email || "");
  formData.append("file", file);
  return api.post(`/api/user/documents/${documentId}/reupload`, formData);
}

export async function updateUserLoanContact(loanId, email, contact) {
  return api.patch(`/api/user/loans/${loanId}/contact`, {
    email,
    contact_email: contact.contact_email,
    primary_mobile: contact.primary_mobile,
    alternate_mobile: contact.alternate_mobile,
  });
}

export async function submitLoanApplication(formData) {
  return api.post("/api/loan/apply", formData);
}

// Notifications
export async function fetchNotifications(email, role = "user") {
  const data = await api.get(`/api/notifications?email=${encodeURIComponent(email)}&role=${role}`);
  return data.notifications || [];
}

export async function markNotificationsRead(email, role = "user", id = null) {
  return api.patch("/api/notifications/read", { email, role, id });
}

// Admin Remarks
export async function fetchRemarks(loanId) {
  const data = await api.get(`/api/admin/loans/${loanId}/remarks`);
  return data.remarks || [];
}

export async function addRemark(loanId, adminEmail, remark) {
  return api.post(`/api/admin/loans/${loanId}/remarks`, { admin_email: adminEmail, remark });
}

// Loan Status History
export async function fetchLoanHistory(loanId) {
  const data = await api.get(`/api/loans/${loanId}/history`);
  return data.history || [];
}

// Admin Analytics
export async function fetchAdminAnalytics() {
  return api.get("/api/admin/analytics");
}

// Loan Report Data (for PDF generation on frontend)
export async function fetchLoanReportData(loanId, email, role = "user") {
  return api.get(`/api/loans/${loanId}/report?email=${encodeURIComponent(email || "")}&role=${role}`);
}

// Re-export for document URLs
export { API_BASE_URL };
