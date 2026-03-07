export default function Documentation({ navigate, onLogout }) {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "24px 26px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #e3ecff 0%, #f5f8ff 40%, #ffffff 100%)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "rgba(238, 243, 252, 0.9)",
          borderRadius: 16,
          boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
          padding: "20px 22px",
          boxSizing: "border-box",
        }}
      >
        {/* Banner / Hero */}
        <div
          style={{
            borderRadius: 18,
            padding: "14px 18px",
            marginBottom: 18,
            background:
              "linear-gradient(135deg, rgba(43,125,233,0.96), rgba(26,95,196,0.98))",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
              >
                Loan Documentation Centre
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Review key loan information, then manage or apply for loans.
              </div>
            </div>

            <button
              className="home-btn-blue"
              style={{
                width: "auto",
                padding: "8px 14px",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
              onClick={() => {
                if (typeof onLogout === "function") {
                  onLogout();
                } else {
                  navigate("index");
                }
              }}
            >
              Logout
            </button>
          </div>

          <div
            style={{
              marginTop: 6,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-blue"
              style={{
                flex: "1 1 120px",
                marginTop: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(224,236,255,0.96))",
                color: "#1a5fc4",
                boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
              }}
              onClick={() => navigate("user-dashboard")}
            >
              My Loans
            </button>
            <button
              className="btn-orange"
              style={{ flex: "1 1 120px", marginTop: 0 }}
              onClick={() => navigate("apply-loan")}
            >
              Apply Loan
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div style={{ fontSize: 13, textAlign: "left" }}>
          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              1. Loan Basics
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>
                <strong>What is a loan?</strong> Borrowed money that you agree
                to repay with interest over a fixed period.
              </li>
              <li>
                <strong>Common types:</strong> personal, home, vehicle,
                education, and business loans.
              </li>
              <li>
                <strong>Principal:</strong> the original amount of money you
                borrow.
              </li>
              <li>
                <strong>Tenure:</strong> the total duration of the loan (e.g.{" "}
                12–60 months).
              </li>
              <li>
                <strong>EMI (Equated Monthly Instalment):</strong> a fixed
                monthly amount that includes both principal and interest.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              2. Interest & Cost of Credit
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>
                <strong>Interest rate:</strong> the percentage charged on the
                principal; can be fixed or floating.
              </li>
              <li>
                <strong>Processing fees:</strong> one‑time charges added at the
                beginning of the loan.
              </li>
              <li>
                <strong>Pre‑payment / foreclosure charges:</strong> fees for
                closing the loan early (if applicable).
              </li>
              <li>
                <strong>Total cost of the loan:</strong> principal + interest +
                all fees and charges over the full tenure.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              3. Risks & Responsibilities
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Late EMIs may attract penalties and higher interest.</li>
              <li>Missed payments can negatively impact your credit score.</li>
              <li>
                High loan amounts or multiple loans can create repayment stress.
              </li>
              <li>
                For secured loans, default can lead to loss of collateral.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              4. Do&apos;s
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Borrow only what you can comfortably repay.</li>
              <li>Compare interest rates, fees, and features across lenders.</li>
              <li>Maintain a good credit score by paying EMIs on time.</li>
              <li>
                Keep copies of all signed documents and repayment schedules.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              5. Don&apos;ts
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Don&apos;t sign blank forms or incomplete documents.</li>
              <li>Don&apos;t hide existing loans or obligations.</li>
              <li>
                Don&apos;t rely on informal promises—always read written terms.
              </li>
              <li>
                Don&apos;t ignore communication from your lender regarding EMIs.
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              6. Mandatory Documents (Typical)
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Identity proof (Aadhaar, Passport, Voter ID, PAN).</li>
              <li>Address proof (utility bill, rental agreement, Aadhaar).</li>
              <li>PAN card for financial and tax verification.</li>
              <li>Recent salary slips or bank statements.</li>
              <li>IT returns / Form 16 for the last 1–3 years.</li>
              <li>Recent photographs and a completed application form.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
              7. Lender Evaluation
            </h3>
            <ul style={{ paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Check the lender&apos;s reputation and regulatory status.</li>
              <li>Understand how they handle delays and restructuring.</li>
              <li>Clarify foreclosure rules before you sign.</li>
            </ul>
          </section>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="home-btn-blue"
            style={{ width: "auto", padding: "10px 18px" }}
            onClick={() => navigate("index")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

