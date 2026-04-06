import { PageBg } from "../App";

export default function IndexPage({ navigate }) {
  return (
    <PageBg>
      <div className="index-card">
        <div className="index-logo-panel" style={{ textAlign: "center" }}>
          <div className="logo-mark" style={{ transform: "scale(1.08)", marginTop: 2 }}>
            <span className="logo-ez" style={{ color: "#3736a7" }}>EZ</span>
            <span className="logo-l" style={{ color: "#f97316" }}>
              L
              <svg width="22" height="13" viewBox="0 0 22 13" fill="none" style={{ position: "absolute", top: -10, right: -16 }}>
                <path d="M1 12L11 2L21 12" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div className="logo-tagline" style={{ marginTop: 10, letterSpacing: "4.5px", fontWeight: 700, color: "#6b7fa6" }}>Easy Loan</div>
        </div>

        <div className="index-buttons">
          <button className="index-btn-user" onClick={() => navigate("user-login")}>
            User
          </button>
          <button className="index-btn-admin" onClick={() => navigate("admin-login")}>
            Admin
          </button>
        </div>
      </div>
    </PageBg>
  );
}