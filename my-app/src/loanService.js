import { API_BASE_URL } from "./api";

export async function fetchAdminLoans() {
  const res = await fetch(`${API_BASE_URL}/api/admin/loans`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load loans.");
  }

  return data.loans || [];
}

export async function fetchAdminLoanDetail(loanId) {
  const res = await fetch(`${API_BASE_URL}/api/admin/loans/${loanId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load loan details.");
  }

  return data;
}

export async function updateAdminLoanStatus(loanId, status) {
  const res = await fetch(`${API_BASE_URL}/api/admin/loans/${loanId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Failed to update status.");
  }

  return data;
}

export async function fetchUserLoans(email) {
  const res = await fetch(
    `${API_BASE_URL}/api/user/loans?email=${encodeURIComponent(email || "")}`
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to load loans.");
  }

  return data.loans || [];
}

export async function fetchUserLoanDetail(loanId, email) {
  const res = await fetch(
    `${API_BASE_URL}/api/user/loans/${loanId}?email=${encodeURIComponent(
      email || ""
    )}`
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || data.message || "Failed to load loan details."
    );
  }

  return data;
}

export async function updateUserLoanContact(loanId, email, contact) {
  const res = await fetch(
    `${API_BASE_URL}/api/user/loans/${loanId}/contact`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        contact_email: contact.contact_email,
        primary_mobile: contact.primary_mobile,
        alternate_mobile: contact.alternate_mobile,
      }),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Failed to update.");
  }

  return data;
}
