import { PageBg } from "../App";

export default function IndexPage({ navigate }) {
  return (
    <PageBg>
      <div className="index-card">
        <div style={{ textAlign: "center" }}>
          <div className="logo-mark">
            <span className="logo-ez">EZ</span>
            <span className="logo-l">
              L
              <svg
                width="22" height="13" viewBox="0 0 22 13" fill="none"
                style={{ position: "absolute", top: -10, right: -16 }}
              >
                <path d="M1 12L11 2L21 12" stroke="#e87820" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <div className="logo-tagline" style={{ marginTop: 6 }}>Easy Loan</div>
        </div>

        <div className="divider" />

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