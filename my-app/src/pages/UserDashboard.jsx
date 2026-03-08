import { useEffect, useMemo, useState } from "react";

const statusTheme = {
  Draft: {
    pillBg: "#e5e7eb",
    pillColor: "#334155",
    rowBorder: "#cfd5df",
    progress: 12,
    note: "Saved as draft",
    headingBg: "#f1f5f9",
    headingColor: "#334155",
  },
  Pending: {
    pillBg: "#fff0cf",
    pillColor: "#7b5a00",
    rowBorder: "#ead59b",
    progress: 25,
    note: "Awaiting review",
    headingBg: "#eef4ff",
    headingColor: "#1a5fc4",
  },
  Accepted: {
    pillBg: "#dff4e5",
    pillColor: "#1f7a3f",
    rowBorder: "#bee4cb",
    progress: 58,
    note: "Schedule active",
    headingBg: "#eaf8ef",
    headingColor: "#1f7a3f",
  },
  Rejected: {
    pillBg: "#ffe0e0",
    pillColor: "#a12727",
    rowBorder: "#edbcbc",
    progress: 100,
    note: "See reason in details",
    headingBg: "#fff0f0",
    headingColor: "#d62828",
  },
};

function normalizeLoan(loan) {
  const status = (loan.status || "").toLowerCase();
  let bucket = "Pending";
  if (status === "draft") bucket = "Draft";
  if (status === "rejected") bucket = "Rejected";
  else if (status === "approved" || status === "accepted") bucket = "Accepted";
  return { ...loan, bucket };
}

export default function UserDashboard({ navigate, userEmail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:5000/api/user/loans?email=${encodeURIComponent(
            userEmail || ""
          )}`
        );
        const data = await res.json();
        if (res.ok) {
          setLoans(data.loans || []);
        } else {
          setMessage(data.message || "Failed to load loans.");
        }
      } catch (err) {
        setMessage("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchLoans();
    else {
      setLoading(false);
      setMessage("No user session. Please login again.");
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      setHasLocalDraft(false);
      return;
    }
    const key = `loan_draft_${userEmail}`;
    setHasLocalDraft(Boolean(localStorage.getItem(key)));
  }, [userEmail]);

  const normalizedLoans = useMemo(() => loans.map(normalizeLoan), [loans]);
  const visibleLoans = normalizedLoans.filter((l) => l.bucket !== "Draft");
  const pendingLoans = visibleLoans.filter((l) => l.bucket === "Pending");
  const acceptedLoans = visibleLoans.filter((l) => l.bucket === "Accepted");
  const rejectedLoans = visibleLoans.filter((l) => l.bucket === "Rejected");
  const hasAnyLoans = visibleLoans.length > 0;
  const totalAmount = visibleLoans.reduce(
    (sum, loan) => sum + Number(loan.loan_amount || 0),
    0
  );

  const renderLoanRow = (loan) => {
    const meta = statusTheme[loan.bucket] || statusTheme.Pending;
    return (
      <div
        key={loan.loan_id}
        style={{
          background: "#fff",
          border: `1px solid ${meta.rowBorder}`,
          borderRadius: 12,
          padding: "11px 12px",
          boxShadow: "0 3px 10px rgba(15,23,42,0.08)",
          marginBottom: 10,
          cursor: "pointer",
        }}
        onClick={() => navigate("user-loan-detail", { userLoanId: loan.loan_id })}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "95px 1fr 150px 92px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              background: meta.pillBg,
              color: meta.pillColor,
            }}
          >
            {loan.bucket}
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.9fr 1fr",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                Loan #{loan.loan_id}
              </div>
              <div style={{ fontSize: 13, color: "#1f2a44", fontWeight: 700 }}>
                Rs {Number(loan.loan_amount || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#4b5565", fontWeight: 700 }}>Tenure</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                {loan.tenure} months
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#4b5565", fontWeight: 700 }}>Applied</div>
              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                {loan.applied_date
                  ? new Date(loan.applied_date).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#3f4b62", marginBottom: 4, fontWeight: 700 }}>
              Insight
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                borderRadius: 999,
                background: "#e4e9f3",
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: `${meta.progress}%`,
                  height: "100%",
                  background:
                    loan.bucket === "Rejected"
                      ? "#d15353"
                      : loan.bucket === "Accepted"
                      ? "#2f9b57"
                      : "#be8c11",
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: "#5f6b83" }}>{meta.note}</div>
          </div>

          <div
            style={{
              textAlign: "right",
              color: "#1a4ea1",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            View
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "18px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 10% 20%, #ebf2ff 0%, #e3ecff 40%, #d9e6ff 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          background: "#eef3f8",
          border: "1px solid #d6dfeb",
          borderRadius: 20,
          padding: "16px",
          boxShadow: "0 14px 30px rgba(17,24,39,0.12)",
        }}
      >
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: 34,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.1,
              }}
            >
              My Loans
            </div>
            <div style={{ fontSize: 16, marginTop: 3, color: "#334155" }}>
              {userEmail ? `Welcome, ${userEmail}` : "Welcome"}
            </div>
          </div>
          {hasLocalDraft && (
            <button
              className="home-btn-blue"
              style={{ width: "auto", padding: "10px 14px" }}
              onClick={() => navigate("apply-loan")}
            >
              Draft
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {[
            { title: "Total Loans", value: visibleLoans.length },
            { title: "Pending", value: pendingLoans.length },
            { title: "Accepted", value: acceptedLoans.length },
            { title: "Rejected", value: rejectedLoans.length },
            {
              title: "Total Active/Pending Amount",
              value: `Rs ${totalAmount.toLocaleString()}`,
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#fff",
                border: "1px solid #d9e0ea",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
              }}
            >
              <div style={{ fontSize: 13, color: "#4b5565", marginBottom: 4, fontWeight: 700 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 30, color: "#0f172a", fontWeight: 800, lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {loading && <div style={{ fontSize: 14, color: "#334155", fontWeight: 700 }}>Loading...</div>}

        {message && !loading && (
          <div
            style={{
              background: "#fff6eb",
              border: "1px solid #ffd9af",
              color: "#9b4f00",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        {!loading && !message && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "270px 1fr 190px",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #d9e0ea",
                borderRadius: 12,
                padding: "12px",
                boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                minHeight: 270,
              }}
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 10,
                }}
              >
                My Applications
              </div>
              {pendingLoans.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <div style={{ fontSize: 40, color: "#c3cad8", lineHeight: 1 }}>[]</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 8 }}>
                    No pending applications
                  </div>
                  <div style={{ fontSize: 13, color: "#4b5565", marginTop: 4 }}>
                    Click "Apply for Loan" to start.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "#1f2a44", lineHeight: 1.6 }}>
                  {pendingLoans.length} application
                  {pendingLoans.length > 1 ? "s are" : " is"} currently pending review.
                </div>
              )}

            </div>

            <div>
              {!hasAnyLoans ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #d9e0ea",
                    borderRadius: 12,
                    padding: "16px 14px",
                    boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>No loan records found</div>
                  <div style={{ fontSize: 13, color: "#4b5565", marginTop: 4 }}>
                    Apply for a loan to track status and details.
                  </div>
                </div>
              ) : (
                <>
                  {acceptedLoans.map(renderLoanRow)}
                  {pendingLoans.map(renderLoanRow)}
                  {rejectedLoans.map(renderLoanRow)}
                </>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn-blue"
                style={{ width: "100%", marginTop: 0, padding: "10px 12px" }}
                onClick={() => navigate("apply-loan")}
              >
                Apply for Loan
              </button>
              <button
                className="home-btn-blue"
                style={{ width: "100%", padding: "10px 12px" }}
                onClick={() => navigate("user-analytics")}
              >
                View Dashboard
              </button>
              <button
                className="home-btn-blue"
                style={{ width: "100%", padding: "10px 12px" }}
                onClick={() => navigate("documentation")}
              >
                Back to Documentation
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "#4c5b74" }}>
          Click any loan row to view details and uploaded documents.
        </div>
      </div>
    </div>
  );
}
