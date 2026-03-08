import { useEffect, useState } from "react";

const API = "http://localhost:5000";

export default function UserLoanDetail({ navigate, userEmail, loanId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    contact_email: "",
    primary_mobile: "",
    alternate_mobile: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!loanId) {
      setLoading(false);
      setMessage("No loan selected.");
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setMessage("");
        const res = await fetch(
          `${API}/api/user/loans/${loanId}?email=${encodeURIComponent(userEmail || "")}`
        );
        const json = await res.json();
        if (res.ok) {
          setData(json);
          setEditForm({
            contact_email: json?.applicant?.contact_email || "",
            primary_mobile: json?.applicant?.primary_mobile || "",
            alternate_mobile: json?.applicant?.alternate_mobile || "",
          });
        } else {
          setMessage(json.error || json.message || "Failed to load loan details.");
        }
      } catch (err) {
        setMessage("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [loanId, userEmail]);

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editForm.contact_email.trim() || !editForm.primary_mobile.trim()) {
      setMessage("Contact email and primary mobile are required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`${API}/api/user/loans/${loanId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          contact_email: editForm.contact_email,
          primary_mobile: editForm.primary_mobile,
          alternate_mobile: editForm.alternate_mobile,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setMessage(json.message || "Updated successfully.");
        setData((prev) =>
          prev
            ? {
                ...prev,
                applicant: {
                  ...prev.applicant,
                  contact_email: editForm.contact_email,
                  primary_mobile: editForm.primary_mobile,
                  alternate_mobile: editForm.alternate_mobile,
                },
              }
            : prev
        );
        setEditMode(false);
      } else {
        setMessage(json.error || json.message || "Failed to update.");
      }
    } catch (err) {
      setMessage("Server error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const { loan, applicant, documents } = data || {};

  const InfoRow = ({ label, value }) => (
    <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 14, alignItems: "center" }}>
      <div style={{ minWidth: 160, color: "#5a6578", fontWeight: 700 }}>{label}:</div>
      <div style={{ color: "#2d3748" }}>{value ?? "-"}</div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #e3ecff 0%, #f5f8ff 40%, #ffffff 100%)",
        }}
      >
        <div className="link-row">Loading loan details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          padding: 24,
          boxSizing: "border-box",
          background:
            "linear-gradient(135deg, #e3ecff 0%, #f5f8ff 40%, #ffffff 100%)",
        }}
      >
        <div className="link-row" style={{ color: "#e06d0a", marginBottom: 12 }}>{message || "Unable to load loan."}</div>
        <button className="home-btn-blue" style={{ width: "auto", padding: "10px 16px" }} onClick={onBack}>
          Back to My Loans
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "18px 22px 24px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #e3ecff 0%, #f5f8ff 40%, #ffffff 100%)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "rgba(255,255,255,0.92)",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 8px 28px rgba(15,23,42,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 22, fontWeight: 800, color: "#1a5fc4" }}>
              Loan #{loan?.loan_id} - Full Details
            </div>
            <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
              Read-only view with editable contact details.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="home-btn-blue" style={{ width: "auto", padding: "10px 14px" }} onClick={onBack}>
              Back to My Loans
            </button>
            {!editMode ? (
              <button
                className="btn-blue"
                style={{ width: "auto", marginTop: 0, padding: "10px 14px", fontSize: 13 }}
                onClick={() => setEditMode(true)}
              >
                Edit Contact
              </button>
            ) : (
              <>
                <button
                  className="btn-blue"
                  style={{ width: "auto", marginTop: 0, padding: "10px 14px", fontSize: 13 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="home-btn-blue"
                  style={{ width: "auto", padding: "10px 14px" }}
                  onClick={() => {
                    setEditMode(false);
                    setEditForm({
                      contact_email: applicant?.contact_email || "",
                      primary_mobile: applicant?.primary_mobile || "",
                      alternate_mobile: applicant?.alternate_mobile || "",
                    });
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(43,125,233,0.10)", color: "#1a5fc4", fontWeight: 700 }}>
            {message}
          </div>
        )}

        <section style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a5fc4", marginBottom: 10 }}>Uploaded Files</div>
          {documents?.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  style={{
                    background: "#f8fbff",
                    border: "1px solid #d9e7ff",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>{doc.document_type}</div>
                    <div style={{ fontSize: 12, color: "#667085" }}>{doc.original_filename}</div>
                  </div>
                  <a
                    href={`${API}/api/admin/document/${doc.document_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 800, color: "#1a5fc4", textDecoration: "none" }}
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#667085", fontSize: 13 }}>No files uploaded.</div>
          )}
        </section>

        <section style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a5fc4", marginBottom: 10 }}>Loan Information</div>
          <InfoRow label="Loan Amount" value={`Rs ${Number(loan?.loan_amount || 0).toLocaleString()}`} />
          <InfoRow label="Tenure" value={`${loan?.tenure} months`} />
          <InfoRow label="Interest Rate" value={`${loan?.interest_rate}%`} />
          <InfoRow label="EMI" value={`Rs ${Number(loan?.emi || 0).toFixed(2)}`} />
          <InfoRow label="Status" value={loan?.status} />
          <InfoRow label="Applied Date" value={loan?.applied_date ? new Date(loan.applied_date).toLocaleString() : "-"} />
        </section>

        <section style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a5fc4", marginBottom: 10 }}>Applicant Details</div>
          <InfoRow label="Full Name" value={applicant?.full_name} />
          <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 14, alignItems: "center" }}>
            <div style={{ minWidth: 160, color: "#5a6578", fontWeight: 700 }}>Contact Email:</div>
            {editMode ? (
              <input
                className="input-field"
                type="email"
                value={editForm.contact_email}
                onChange={(e) => handleEditChange("contact_email", e.target.value)}
                style={{ maxWidth: 360 }}
              />
            ) : (
              <div style={{ color: "#2d3748", fontSize: 14 }}>{applicant?.contact_email || "—"}</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 14, alignItems: "center" }}>
            <div style={{ minWidth: 160, color: "#5a6578", fontWeight: 700 }}>Primary Mobile:</div>
            {editMode ? (
              <input
                className="input-field"
                value={editForm.primary_mobile}
                onChange={(e) => handleEditChange("primary_mobile", e.target.value)}
                style={{ maxWidth: 260 }}
              />
            ) : (
              <div style={{ color: "#2d3748", fontSize: 14 }}>{applicant?.primary_mobile || "—"}</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 14, alignItems: "center" }}>
            <div style={{ minWidth: 160, color: "#5a6578", fontWeight: 700 }}>Alternate Mobile:</div>
            {editMode ? (
              <input
                className="input-field"
                value={editForm.alternate_mobile}
                onChange={(e) => handleEditChange("alternate_mobile", e.target.value)}
                style={{ maxWidth: 260 }}
              />
            ) : (
              <div style={{ color: "#2d3748", fontSize: 14 }}>{applicant?.alternate_mobile || "—"}</div>
            )}
          </div>
          <InfoRow label="Date of Birth" value={applicant?.dob} />
          <InfoRow label="Address Line 1" value={applicant?.address_line1} />
          <InfoRow label="Address Line 2" value={applicant?.address_line2} />
          <InfoRow label="City" value={applicant?.city} />
          <InfoRow label="State" value={applicant?.state} />
          <InfoRow label="Postal Code" value={applicant?.postal_code} />
          <InfoRow label="PAN Number" value={applicant?.pan_number} />
          <InfoRow label="Aadhaar Number" value={applicant?.aadhaar_number} />
          <InfoRow label="Monthly Income" value={applicant?.monthly_income != null ? `Rs ${Number(applicant.monthly_income).toLocaleString()}` : "-"} />
          <InfoRow label="Employer" value={applicant?.employer_name} />
          <InfoRow label="Employment Type" value={applicant?.employment_type} />
          <InfoRow label="Loan Purpose" value={applicant?.loan_purpose} />
          <InfoRow label="Notes" value={applicant?.notes} />
        </section>
      </div>
    </div>
  );
}


