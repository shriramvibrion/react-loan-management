import { useEffect, useState } from "react";

export default function UserDashboard({ navigate, userEmail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

    if (userEmail) {
      fetchLoans();
    } else {
      setLoading(false);
      setMessage("No user session. Please login again.");
    }
  }, [userEmail]);

  const normalizedLoans = loans.map((loan) => {
    const status = (loan.status || "").toLowerCase();
    let bucket = "Pending";
    if (status === "rejected") bucket = "Rejected";
    else if (status === "approved" || status === "accepted") bucket = "Accepted";
    return { ...loan, bucket };
  });

  const pendingLoans = normalizedLoans.filter((l) => l.bucket === "Pending");
  const acceptedLoans = normalizedLoans.filter((l) => l.bucket === "Accepted");
  const rejectedLoans = normalizedLoans.filter((l) => l.bucket === "Rejected");

  const hasAnyLoans = normalizedLoans.length > 0;

  const renderLoanCard = (loan) => (
    <div
      key={loan.loan_id}
      style={{
        background: "linear-gradient(145deg, #eef4ff 0%, #e4eeff 100%)",
        border: "1px solid #cfe0ff",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 4px 14px rgba(26,95,196,0.14)",
        marginBottom: 10,
        fontSize: 12,
        cursor: "pointer",
      }}
      onClick={() => navigate("user-loan-detail", { userLoanId: loan.loan_id })}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a5fc4", lineHeight: 1.2 }}>
          Loan #{loan.loan_id}
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            background:
              loan.bucket === "Pending"
                ? "#efe3b0"
                : loan.bucket === "Accepted"
                ? "#d8f0de"
                : "#f6d7d7",
            color:
              loan.bucket === "Pending"
                ? "#7e6504"
                : loan.bucket === "Accepted"
                ? "#1f7a3f"
                : "#a12727",
          }}
        >
          {loan.bucket}
        </span>
      </div>

      <div style={{ fontSize: 14, color: "#344054", marginBottom: 3 }}>
        <span style={{ fontWeight: 700 }}>User ID:</span> {loan.user_id}
      </div>
      <div style={{ fontSize: 14, color: "#344054", marginBottom: 3 }}>
        <span style={{ fontWeight: 700 }}>Name:</span> {loan.user_name || "—"}
      </div>
      <div style={{ fontSize: 14, color: "#344054", marginBottom: 8 }}>
        <span style={{ fontWeight: 700 }}>Email:</span> {loan.user_email || "—"}
      </div>

      <div style={{ color: "#1a5fc4", fontWeight: 800, fontSize: 13 }}>
        Click to view full details →
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "16px 22px 22px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #e3ecff 0%, #f5f8ff 40%, #ffffff 100%)",
        overflowX: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: "#1a5fc4",
            }}
          >
            My Loans
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#555",
            }}
          >
            {userEmail ? `Welcome, ${userEmail}` : "User dashboard"}
          </div>
        </div>

        <button
          className="btn-orange"
          style={{ width: "auto", padding: "10px 16px", marginTop: 0 }}
          onClick={() => navigate("apply-loan")}
        >
          Apply for Loan
        </button>
      </div>

      {loading && <div className="link-row">Loading...</div>}

      {message && !loading && (
        <div className="link-row" style={{ color: "#e06d0a" }}>
          {message}
        </div>
      )}

      {!loading && !message && !hasAnyLoans && (
        <div
          className="link-row"
          style={{ marginTop: 40, fontSize: 15, color: "#555" }}
        >
          No loan applied.
        </div>
      )}

      {!loading && !message && hasAnyLoans && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <div style={{ flex: "1 1 190px" }}>
            <div
              style={{
                background: "#cfd6e1",
                color: "#1a5fc4",
                borderRadius: 14,
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              Pending
            </div>
            {pendingLoans.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                No pending loans.
              </div>
            ) : (
              pendingLoans.map(renderLoanCard)
            )}
          </div>

          <div style={{ flex: "1 1 190px" }}>
            <div
              style={{
                background: "#cfd6e1",
                color: "#50c878",
                borderRadius: 14,
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              Accepted
            </div>
            {acceptedLoans.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                No accepted loans.
              </div>
            ) : (
              acceptedLoans.map(renderLoanCard)
            )}
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <div
              style={{
                background: "#cfd6e1",
                color: "#d62828",
                borderRadius: 14,
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 900,
                textAlign: "center",
              }}
            >
              Rejected
            </div>
            {rejectedLoans.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                No rejected loans.
              </div>
            ) : (
              rejectedLoans.map(renderLoanCard)
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          className="home-btn-blue"
          style={{ width: "auto", padding: "10px 18px" }}
          onClick={() => navigate("documentation")}
        >
          Back to Documentation
        </button>
      </div>
    </div>
  );
}

