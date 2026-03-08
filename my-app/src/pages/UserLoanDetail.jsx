import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchUserLoanDetail, updateUserLoanContact, API_BASE_URL } from "../services/loanService";
import Loader from "../components/ui/Loader";

function Section({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a5fc4", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 14 }}>
      <span style={{ color: "#5a6578", minWidth: 140 }}>{label}:</span>
      <span style={{ color: "#2d3748" }}>{value ?? "-"}</span>
    </div>
  );
}

export default function UserLoanDetail() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const { userEmail } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ contact_email: "", primary_mobile: "", alternate_mobile: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loanId || !userEmail) {
      setLoading(false);
      setMessage("No loan selected.");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const json = await fetchUserLoanDetail(loanId, userEmail);
        setData(json);
        if (json?.applicant) {
          setContactForm({
            contact_email: json.applicant.contact_email || "",
            primary_mobile: json.applicant.primary_mobile || "",
            alternate_mobile: json.applicant.alternate_mobile || "",
          });
        }
      } catch (err) {
        setMessage(err.message || "Failed to load loan details.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId, userEmail]);

  const handleSaveContact = async () => {
    if (!loanId || saving) return;
    try {
      setSaving(true);
      const json = await updateUserLoanContact(loanId, userEmail, contactForm);
      toast.success(json.message || "Contact information updated.");
      setEditingContact(false);
      setData((prev) =>
        prev
          ? {
              ...prev,
              applicant: {
                ...prev.applicant,
                contact_email: contactForm.contact_email,
                primary_mobile: contactForm.primary_mobile,
                alternate_mobile: contactForm.alternate_mobile,
              },
            }
          : null
      );
    } catch (err) {
      toast.error(err.message || "Failed to update contact info.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)" }}>
        <Loader text="Loading loan details..." size={36} />
      </div>
    );
  }

  if (message && !data) {
    return (
      <div style={{ minHeight: "100vh", padding: 22, background: "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)", color: "#0f172a" }}>
        <div style={{ width: "min(1120px, 96vw)", margin: "0 auto", background: "rgba(255,255,255,0.55)", borderRadius: 18, padding: 18, boxShadow: "0 18px 60px rgba(15, 23, 42, 0.12)", backdropFilter: "blur(16px)" }}>
          <div style={{ color: "#1a5fc4", marginBottom: 16, fontWeight: 700 }}>{message}</div>
          <button className="home-btn-blue" onClick={() => navigate("/user/dashboard")}>Back</button>
        </div>
      </div>
    );
  }

  const { loan, applicant, documents } = data || {};
  const status = (loan?.status || "").toLowerCase();
  const docViewUrl = (docId) => `${API_BASE_URL}/api/user/document/${docId}`;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "22px 18px",
        boxSizing: "border-box",
        background: "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "min(1120px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.12)",
          borderRadius: 18,
          padding: 18,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 22, fontWeight: 900, color: "#1a5fc4" }}>
              Loan #{loan?.loan_id} — Details
            </div>
            <div style={{ fontSize: 14, color: "#5a6578", marginTop: 4 }}>
              View your application status, details, and documents
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: status === "pending" ? "#fff3cd" : status === "rejected" ? "#f8d7da" : "#d4edda",
                color: status === "pending" ? "#856404" : status === "rejected" ? "#721c24" : "#155724",
              }}
            >
              {loan?.status}
            </span>
            <button
              className="home-btn-blue"
              style={{ width: "auto", padding: "10px 18px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(26,95,196,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
              onClick={() => navigate("/user/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(26,95,196,0.08)", color: "#1a5fc4", marginBottom: 16, fontWeight: 700 }}>
            {message}
          </div>
        )}

        <Section title="Loan Overview">
          <InfoRow label="Loan Amount" value={`Rs ${Number(loan?.loan_amount || 0).toLocaleString()}`} />
          <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
          <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
          <InfoRow label="EMI" value={`Rs ${Number(loan?.emi || 0).toFixed(2)}`} />
          <InfoRow label="Applied Date" value={loan?.applied_date ? new Date(loan.applied_date).toLocaleString() : null} />
        </Section>

        {applicant && (
          <Section title="Applicant Details">
            <InfoRow label="Full Name" value={applicant.full_name} />
            <InfoRow label="Date of Birth" value={applicant.dob} />
            <InfoRow label="Address" value={[applicant.address_line1, applicant.address_line2, applicant.city, applicant.state, applicant.postal_code].filter(Boolean).join(", ")} />
            <InfoRow label="PAN Number" value={applicant.pan_number} />
            <InfoRow label="Aadhaar Number" value={applicant.aadhaar_number} />
            <InfoRow label="Monthly Income" value={applicant.monthly_income != null ? `Rs ${Number(applicant.monthly_income).toLocaleString()}` : null} />
            <InfoRow label="Employer" value={applicant.employer_name} />
            <InfoRow label="Employment Type" value={applicant.employment_type} />
            <InfoRow label="Loan Purpose" value={applicant.loan_purpose} />
            {applicant.notes && <InfoRow label="Notes" value={applicant.notes} />}
          </Section>
        )}

        <Section title="Contact Information">
          {editingContact ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="input-field"
                placeholder="Contact Email"
                value={contactForm.contact_email}
                onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Primary Mobile"
                value={contactForm.primary_mobile}
                onChange={(e) => setContactForm({ ...contactForm, primary_mobile: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Alternate Mobile"
                value={contactForm.alternate_mobile}
                onChange={(e) => setContactForm({ ...contactForm, alternate_mobile: e.target.value })}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-blue" style={{ width: "auto", padding: "10px 20px", marginTop: 0 }} onClick={handleSaveContact} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="home-btn-blue" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setEditingContact(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Contact Email" value={applicant?.contact_email} />
              <InfoRow label="Primary Mobile" value={applicant?.primary_mobile} />
              <InfoRow label="Alternate Mobile" value={applicant?.alternate_mobile} />
              <button
                className="home-btn-blue"
                style={{ width: "auto", padding: "8px 16px", marginTop: 8 }}
                onClick={() => setEditingContact(true)}
              >
                Edit Contact Info
              </button>
            </>
          )}
        </Section>

        <Section title="Uploaded Documents">
          {documents?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.75)",
                    borderRadius: 10,
                    flexWrap: "wrap",
                    gap: 10,
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: "#2d3748" }}>{doc.document_type}</div>
                    <div style={{ fontSize: 12, color: "#5a6578" }}>{doc.original_filename}</div>
                  </div>
                  <a
                    href={docViewUrl(doc.document_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "#1a5fc4",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 800,
                      fontSize: 13,
                      boxShadow: "0 8px 18px rgba(26,95,196,0.22)",
                    }}
                  >
                    View / Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#5a6578" }}>No documents uploaded.</div>
          )}
        </Section>
      </div>
    </div>
  );
}
