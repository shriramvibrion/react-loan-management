import { useAuth } from "../auth/AuthContext";

const coreSections = [
  {
    title: "Loan Basics",
    items: [
      "What is a loan? Borrowed money repaid with interest over a fixed period.",
      "Common types: personal, home, vehicle, education, and business loans.",
      "Principal: the original amount borrowed.",
      "Tenure: the repayment duration, usually in months.",
      "EMI: fixed monthly payment covering principal and interest.",
    ],
  },
  {
    title: "Interest & Cost of Credit",
    items: [
      "Interest rate can be fixed or floating based on lender policy.",
      "Processing fees are one-time charges at disbursal.",
      "Foreclosure or prepayment charges may apply based on terms.",
      "Total loan cost = principal + interest + all applicable fees.",
    ],
  },
  {
    title: "Risks & Responsibilities",
    items: [
      "Late EMI payments can attract penalties and extra interest.",
      "Missed payments may reduce your credit score.",
      "Over-borrowing can create repayment stress.",
      "For secured loans, collateral may be at risk in default.",
    ],
  },
  {
    title: "Mandatory Documents (Typical)",
    items: [
      "Identity proof: Aadhaar, Passport, Voter ID, PAN.",
      "Address proof: utility bill, rental agreement, Aadhaar.",
      "PAN for tax and financial verification.",
      "Recent salary slips or bank statements.",
      "IT returns / Form 16 for previous years.",
      "Recent photograph and completed application form.",
    ],
  },
];

const bestPractices = [
  "Borrow only what you can comfortably repay.",
  "Compare rates, fees, and foreclosure terms before applying.",
  "Keep digital and physical copies of all signed documents.",
  "Track EMI due dates with reminders to avoid penalties.",
];

const cautionPoints = [
  "Do not sign blank or incomplete forms.",
  "Do not hide existing obligations during application.",
  "Do not rely on verbal promises; read final written terms.",
  "Do not ignore lender communication on repayments.",
];

const disclaimers = [
  "Approval is subject to verification and lender policy.",
  "Rates shown are indicative and may vary by profile.",
  "Eligibility rules can change without prior notice.",
  "Incomplete or incorrect data can delay or reject processing.",
  "Final sanction letter terms always take precedence.",
];

export default function Documentation({ navigate, onLogout }) {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else logout();
  };

  return (
    <div
      className="page-bg-image"
      style={{
        height: "100vh",
        width: "100vw",
        padding: "20px 22px",
        boxSizing: "border-box",
        background:
          "radial-gradient(ellipse at 0% 0%, #dbeafe 0%, #e0e7ff 28%, #f1f5f9 72%)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1500,
          margin: "0 auto",
          background: "rgba(238,243,252,0.84)",
          border: "1px solid rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 20,
          boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
          padding: "18px 18px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            borderRadius: 16,
            padding: "14px 16px 12px",
            background:
              "linear-gradient(130deg, #4338ca, #6366f1)",
            color: "var(--text-on-accent)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ textAlign: "center", paddingLeft: 56 }}>
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                }}
              >
                Loan Documentation Centre
              </div>
              <div
                style={{
                  fontSize: 13,
                  marginTop: 3,
                  opacity: 0.95,
                  fontWeight: 500,
                }}
              >
                Understand key terms, compare expectations, and move to action confidently.
              </div>
            </div>

            <button
              className="home-btn-blue"
              style={{
                width: "auto",
                padding: "8px 14px",
                background: "rgba(255,255,255,0.14)",
                color: "var(--text-on-accent)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(6, 24, 66, 0.22)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 8,
                  letterSpacing: 0.35,
                }}
              >
                Product Highlights
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.1)" }}>
                  Lower interest burden with clearer repayment planning.
                </div>
                <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.1)" }}>
                  Transparent fee awareness before application.
                </div>
                <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.1)" }}>
                  Document checklist to avoid avoidable delays.
                </div>
                <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.1)" }}>
                  Risk and responsibility guide for safer borrowing.
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                {[
                  { label: "Core Guides", value: "8" },
                  { label: "Doc Types", value: "6+" },
                  { label: "Read Time", value: "~5m" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.32)",
                      padding: "7px 6px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 10, opacity: 0.88 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn-blue"
                  style={{
                    width: 128,
                    marginTop: 0,
                    padding: "9px 12px",
                    fontSize: 12,
                    letterSpacing: 0.9,
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(224,236,255,0.96))",
                    color: "#4338ca",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                  }}
                  onClick={() => navigate("user-dashboard")}
                >
                  My Loans
                </button>
                <button
                  className="btn-orange"
                  style={{
                    width: 128,
                    marginTop: 0,
                    padding: "9px 12px",
                    fontSize: 12,
                    letterSpacing: 0.9,
                    boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                  }}
                  onClick={() => navigate("apply-loan")}
                >
                  Apply Loan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(99,102,241,0.12)",
              borderRadius: 16,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16,
                fontWeight: 800,
                color: "#312e81",
                marginBottom: 10,
              }}
            >
              Borrowing Guide
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {coreSections.map((section, idx) => (
                <section
                  key={section.title}
                  style={{
                    border: "1px solid rgba(99,102,241,0.1)",
                    borderRadius: 12,
                    padding: "10px 11px",
                    background: idx % 2 === 0 ? "#f8faff" : "#eef2ff",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      marginBottom: 6,
                      fontWeight: 800,
                      color: "#312e81",
                    }}
                  >
                    {idx + 1}. {section.title}
                  </h3>
                  <ul style={{ paddingLeft: 18, lineHeight: 1.5, fontSize: 13 }}>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <section
              style={{
                background: "#ffffff",
                border: "1px solid rgba(99,102,241,0.12)",
                borderRadius: 16,
                padding: "10px 12px",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  marginBottom: 6,
                  fontWeight: 800,
                  color: "#312e81",
                }}
              >
                5. Do&apos;s
              </h3>
              <ul style={{ paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
                {bestPractices.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section
              style={{
                background: "#ffffff",
                border: "1px solid rgba(99,102,241,0.12)",
                borderRadius: 16,
                padding: "10px 12px",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  marginBottom: 6,
                  fontWeight: 800,
                  color: "#312e81",
                }}
              >
                6. Don&apos;ts
              </h3>
              <ul style={{ paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
                {cautionPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section
              style={{
                background: "linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)",
                border: "1px solid #c7d2fe",
                borderRadius: 16,
                padding: "10px 12px",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  marginBottom: 6,
                  fontWeight: 800,
                  color: "#312e81",
                }}
              >
                7. Important Disclaimers
              </h3>
              <ul style={{ paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>
                {disclaimers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(99,102,241,0.12)",
            paddingTop: 10,
            color: "#64748b",
            fontSize: 12,
          }}
        >
          <div>Need help? Review terms before submitting your application.</div>
          <button
            className="home-btn-blue"
            style={{ width: "auto", padding: "9px 16px" }}
            onClick={() => navigate("index")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
