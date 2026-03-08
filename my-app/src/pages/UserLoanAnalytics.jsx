import { useEffect, useMemo, useState } from "react";
import { fetchUserLoans } from "../loanService";

function normalizeLoan(loan) {
  const status = (loan.status || "").toLowerCase();
  let bucket = "Pending";
  if (status === "rejected") bucket = "Rejected";
  else if (status === "approved" || status === "accepted") bucket = "Accepted";
  return { ...loan, bucket };
}

function monthDiff(fromDate, toDate) {
  const years = toDate.getFullYear() - fromDate.getFullYear();
  const months = toDate.getMonth() - fromDate.getMonth();
  return years * 12 + months;
}

export default function UserLoanAnalytics({ navigate, userEmail }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchUserLoans(userEmail);
        setLoans(items);
        setMessage("");
      } catch (err) {
        setMessage(err.message || "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) load();
    else {
      setLoading(false);
      setMessage("No user session. Please login again.");
    }
  }, [userEmail]);

  const computed = useMemo(() => {
    const now = new Date();
    const normalized = loans.map(normalizeLoan);

    const enriched = normalized.map((loan) => {
      const tenure = Number(loan.tenure || 0);
      const amount = Number(loan.loan_amount || 0);
      const applied = loan.applied_date ? new Date(loan.applied_date) : null;
      const elapsedRaw = applied ? monthDiff(applied, now) : 0;
      const elapsed = Math.max(0, elapsedRaw);

      const monthsCompleted =
        loan.bucket === "Accepted" ? Math.min(tenure, elapsed) : 0;
      const remainingMonths = Math.max(0, tenure - monthsCompleted);
      const amountPaid =
        tenure > 0 ? amount * (monthsCompleted / tenure) : 0;
      const amountRemaining = Math.max(0, amount - amountPaid);
      const paidPercent =
        amount > 0 ? Math.round((amountPaid / amount) * 100) : 0;
      const monthCompletedPercent =
        tenure > 0 ? Math.round((monthsCompleted / tenure) * 100) : 0;

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
    });
    const perLoan = [...enriched]
      .filter((l) => l.bucket === "Accepted")
      .sort((a, b) => {
        const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
        const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
        return bDate - aDate;
      });

    const counts = {
      Pending: enriched.filter((l) => l.bucket === "Pending").length,
      Accepted: enriched.filter((l) => l.bucket === "Accepted").length,
      Rejected: enriched.filter((l) => l.bucket === "Rejected").length,
    };

    const active = enriched.filter(
      (l) => l.bucket === "Pending" || l.bucket === "Accepted"
    );
    const totalLoanAmount = active.reduce((s, l) => s + l.amount, 0);
    const totalPaid = active.reduce((s, l) => s + l.amountPaid, 0);
    const totalRemaining = Math.max(0, totalLoanAmount - totalPaid);
    const totalMonths = active.reduce((s, l) => s + l.tenure, 0);
    const monthsCompletedTotal = active.reduce((s, l) => s + l.monthsCompleted, 0);
    const monthsRemainingTotal = Math.max(0, totalMonths - monthsCompletedTotal);

    return {
      perLoan,
      counts,
      totalLoanAmount,
      totalPaid,
      totalRemaining,
      totalMonths,
      monthsCompletedTotal,
      monthsRemainingTotal,
      hasData: normalized.length > 0,
    };
  }, [loans]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "18px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 12% 18%, #edf3ff 0%, #dfeafe 42%, #d4e4ff 100%)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          background: "#edf2f8",
          border: "1px solid #d5deea",
          borderRadius: 18,
          padding: "16px",
          boxShadow: "0 14px 30px rgba(15,23,42,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: 30,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Loan Analytics Dashboard
            </div>
            <div style={{ fontSize: 14, color: "#334155" }}>
              {userEmail ? `User: ${userEmail}` : "User analytics"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="home-btn-blue"
              style={{ width: "auto", padding: "10px 14px" }}
              onClick={() => navigate("user-dashboard")}
            >
              Back to My Loans
            </button>
            <button
              className="btn-blue"
              style={{ width: "auto", marginTop: 0, padding: "10px 14px" }}
              onClick={() => navigate("apply-loan")}
            >
              Apply Loan
            </button>
          </div>
        </div>

        {loading && <div style={{ fontWeight: 700, color: "#334155" }}>Loading analytics...</div>}
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

        {!loading && !message && !computed.hasData && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #d9e0ea",
              borderRadius: 12,
              padding: "16px 14px",
              textAlign: "center",
              color: "#334155",
              fontWeight: 700,
            }}
          >
            No loan data available for analytics.
          </div>
        )}

        {!loading && !message && computed.hasData && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                marginBottom: 12,
              }}
            >
              {[
                { label: "Accepted Loans (Analytics)", value: computed.perLoan.length },
                { label: "Total Active/Pending Amount", value: `Rs ${Math.round(computed.totalLoanAmount).toLocaleString()}` },
                { label: "Estimated Amount Paid", value: `Rs ${Math.round(computed.totalPaid).toLocaleString()}` },
                { label: "Estimated Remaining Amount", value: `Rs ${Math.round(computed.totalRemaining).toLocaleString()}` },
                { label: "Months Completed / Remaining", value: `${computed.monthsCompletedTotal} / ${computed.monthsRemainingTotal}` },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "#fff",
                    border: "1px solid #d9e0ea",
                    borderRadius: 12,
                    padding: "10px 12px",
                    boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 4, fontWeight: 700 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 24, color: "#0f172a", fontWeight: 800 }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
                gap: 12,
              }}
            >
              {computed.perLoan.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "#fff",
                    border: "1px solid #d9e0ea",
                    borderRadius: 12,
                    padding: "14px 16px",
                    color: "#475569",
                    fontWeight: 700,
                  }}
                >
                  No accepted loans yet. Analytics cards appear only for accepted loans.
                </div>
              )}
              {computed.perLoan.map((loan) => {
                const statusBg =
                  loan.bucket === "Accepted"
                    ? "#dcfce7"
                    : loan.bucket === "Rejected"
                    ? "#fee2e2"
                    : "#fef3c7";
                const statusColor =
                  loan.bucket === "Accepted"
                    ? "#166534"
                    : loan.bucket === "Rejected"
                    ? "#991b1b"
                    : "#92400e";
                return (
                  <div
                    key={loan.loan_id}
                    style={{
                      background: "#fff",
                      border: "1px solid #d9e0ea",
                      borderRadius: 22,
                      padding: "12px",
                      boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                      aspectRatio: "1 / 1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          Loan #{loan.loan_id} Analytics
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Applied:{" "}
                          {loan.applied_date
                            ? new Date(loan.applied_date).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          background: statusBg,
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {loan.bucket}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          background: "#f1f6ff",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Amount
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#0f172a",
                            fontWeight: 800,
                          }}
                        >
                          Rs {Math.round(loan.amount).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#f1f6ff",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          EMI
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#0f172a",
                            fontWeight: 800,
                          }}
                        >
                          Rs {Math.round(Number(loan.emi || 0)).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#f1f6ff",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Tenure
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#0f172a",
                            fontWeight: 800,
                          }}
                        >
                          {loan.tenure} months
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1e293b",
                          marginBottom: 6,
                        }}
                      >
                        Amount Progress
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr 90px",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#475569" }}>Paid</div>
                        <div
                          style={{
                            height: 10,
                            borderRadius: 999,
                            background: "#e2e8f0",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${loan.paidPercent}%`,
                              height: "100%",
                              background: "#16a34a",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                          {loan.paidPercent}%
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr 90px",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          Remaining
                        </div>
                        <div
                          style={{
                            height: 10,
                            borderRadius: 999,
                            background: "#e2e8f0",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(0, 100 - loan.paidPercent)}%`,
                              height: "100%",
                              background: "#ef4444",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                          {Math.max(0, 100 - loan.paidPercent)}%
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                        Paid: Rs {Math.round(loan.amountPaid).toLocaleString()} |
                        Remaining: Rs {Math.round(loan.amountRemaining).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1e293b",
                          marginBottom: 6,
                        }}
                      >
                        Month Completion
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "#e2e8f0",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${loan.monthCompletedPercent}%`,
                            height: "100%",
                            background: "#2563eb",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                        Completed: {loan.monthsCompleted} month(s) | Remaining:{" "}
                        {loan.remainingMonths} month(s) ({loan.monthCompletedPercent}%
                        completed)
                      </div>
                    </div>

                    <button
                      className="home-btn-blue"
                      style={{ width: "auto", padding: "8px 12px" }}
                      onClick={() =>
                        navigate("user-loan-detail", { userLoanId: loan.loan_id })
                      }
                    >
                      View Loan Details
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
