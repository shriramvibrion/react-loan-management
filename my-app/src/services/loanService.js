import api, { API_BASE_URL } from "../api";

export async function fetchAdminLoans() {
  const data = await api.get("/api/admin/loans");
  return data.loans || [];
}

export async function fetchAdminLoanDetail(loanId) {
  return api.get(`/api/admin/loans/${loanId}`);
}

export async function updateAdminLoanStatus(loanId, status) {
  return api.patch(`/api/admin/loans/${loanId}/status`, { status });
}

export async function fetchUserLoans(email) {
  const data = await api.get(`/api/user/loans?email=${encodeURIComponent(email || "")}`);
  return data.loans || [];
}

export async function fetchUserLoanDetail(loanId, email) {
  return api.get(`/api/user/loans/${loanId}?email=${encodeURIComponent(email || "")}`);
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

// Re-export for document URLs
export { API_BASE_URL };
