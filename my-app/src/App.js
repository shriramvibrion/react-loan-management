import { useState } from "react";
import "./App.css";
import IndexPage from "./pages/IndexPage";
import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLoanDetail from "./pages/AdminLoanDetail";
import Documentation from "./pages/Documentation";
import UserDashboard from "./pages/UserDashboard";
import UserLoanAnalytics from "./pages/UserLoanAnalytics";
import UserLoanDetail from "./pages/UserLoanDetail";
import ApplyLoan from "./pages/ApplyLoan";
import bgImage from "./images/img.png";

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Lato:wght@300;400;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Lato', sans-serif; overflow: hidden; }

  .page {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
  }

  .bg {
    position: absolute;
    inset: 0;
    background-position: right center;
    background-size: cover;
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-color: transparent !important;
    min-height: 100vh;
    z-index: 0;
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, rgba(255,255,255,0) 30%, rgba(220,230,255,0.25) 100%);
    z-index: 1;
  }

  .card-wrap {
    position: relative;
    z-index: 10;
    margin-right: 7vw;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .card {
    background: rgba(238, 243, 252, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 22px;
    padding: 44px 44px 36px;
    width: 380px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.7) inset;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .card-title-blue {
    font-family: 'Montserrat', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #1a5fc4;
    margin-bottom: 4px;
  }

  .card-title-orange {
    font-family: 'Montserrat', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #e87820;
    margin-bottom: 4px;
  }

  .input-field {
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 8px;
    background: rgba(255,255,255,0.85);
    font-family: 'Lato', sans-serif;
    font-size: 14px;
    color: #333;
    outline: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    transition: box-shadow 0.2s, background 0.2s;
  }

  .input-field::placeholder { color: #999; }

  .input-field:focus {
    background: rgba(255,255,255,0.97);
    box-shadow: 0 0 0 2.5px rgba(43,125,233,0.3), 0 2px 8px rgba(0,0,0,0.08);
  }

  .input-field-orange:focus {
    box-shadow: 0 0 0 2.5px rgba(232,120,32,0.3), 0 2px 8px rgba(0,0,0,0.08);
  }

  .btn-blue {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 9px;
    background: linear-gradient(135deg, #2b7de9, #1a5fc4);
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(43,125,233,0.35);
    transition: transform 0.16s, filter 0.16s;
    margin-top: 4px;
  }

  .btn-blue:hover { transform: translateY(-2px); filter: brightness(1.07); }
  .btn-blue:active { transform: translateY(1px); }

  .btn-orange {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 9px;
    background: linear-gradient(135deg, #f5912a, #e06d0a);
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(245,145,42,0.35);
    transition: transform 0.16s, filter 0.16s;
    margin-top: 4px;
  }

  .btn-orange:hover { transform: translateY(-2px); filter: brightness(1.07); }
  .btn-orange:active { transform: translateY(1px); }

  .link-row {
    font-family: 'Lato', sans-serif;
    font-size: 14px;
    color: #333;
    font-weight: 700;
    text-align: center;
  }

  .link-blue {
    color: #6a3fc4;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
  }

  .link-orange {
    color: #6a3fc4;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
  }

  .home-btn-blue {
    width: 100%;
    padding: 11px;
    border-radius: 8px;
    background: rgba(255,255,255,0.7);
    border: none;
    font-family: 'Montserrat', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #2b7de9;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: background 0.18s;
  }

  .home-btn-blue:hover { background: rgba(255,255,255,0.95); }

  .home-btn-orange {
    width: 100%;
    padding: 11px;
    border-radius: 8px;
    background: rgba(255,255,255,0.7);
    border: none;
    font-family: 'Montserrat', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #e87820;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: background 0.18s;
  }

  .home-btn-orange:hover { background: rgba(255,255,255,0.95); }

  .logo-mark {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    position: relative;
  }

  .logo-ez {
    font-family: 'Montserrat', sans-serif;
    font-size: 48px;
    font-weight: 800;
    color: #1a3f8f;
    line-height: 1;
  }

  .logo-l {
    font-family: 'Montserrat', sans-serif;
    font-size: 48px;
    font-weight: 800;
    color: #e87820;
    line-height: 1;
    position: relative;
  }

  .logo-tagline {
    font-family: 'Lato', sans-serif;
    font-size: 12px;
    color: #666;
    letter-spacing: 3px;
    text-transform: uppercase;
    text-align: center;
  }

  .divider {
    width: 55%;
    height: 1px;
    background: linear-gradient(to right, transparent, #c0cde8, transparent);
    margin: 4px auto;
  }

  .index-card {
    background: rgba(238, 243, 252, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 22px;
    padding: 52px 48px 48px;
    width: 380px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.7) inset;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
  }

  .index-buttons {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
  }

  .index-btn-user {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #2b7de9, #1a5fc4);
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(43,125,233,0.35);
    transition: transform 0.16s, filter 0.16s;
  }

  .index-btn-user:hover { transform: translateY(-2px); filter: brightness(1.07); }

  .index-btn-admin {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #f5912a, #e06d0a);
    color: #fff;
    font-family: 'Montserrat', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(245,145,42,0.35);
    transition: transform 0.16s, filter 0.16s;
  }

  .index-btn-admin:hover { transform: translateY(-2px); filter: brightness(1.07); }

  /* Loan application layout */
  .loan-card {
    background: rgba(238, 243, 252, 0.98);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-radius: 22px;
    padding: 22px 22px 18px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.7) inset;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

// ✅ CORRECT: import bgImage at top, then pass via inline style
export function PageBg({ children }) {
  return (
    <div className="page">
      <div
        className="bg"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="bg-overlay" />
      <div className="card-wrap">{children}</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("index");
  const [userEmail, setUserEmail] = useState("");
  const [adminLoanId, setAdminLoanId] = useState(null);
  const [userLoanId, setUserLoanId] = useState(null);

  const handleLogout = () => {
    setUserEmail("");
    setUserLoanId(null);
    setPage("index");
  };

  const handleAdminLogout = () => {
    setAdminLoanId(null);
    setPage("index");
  };

  const navigate = (nextPage, params) => {
    setPage(nextPage);
    if (params?.loanId != null) setAdminLoanId(params.loanId);
    if (params?.userLoanId != null) setUserLoanId(params.userLoanId);
    if (nextPage !== "admin-loan-detail") setAdminLoanId(null);
    if (nextPage !== "user-loan-detail") setUserLoanId(null);
  };

  const renderPage = () => {
    switch (page) {
      case "index":
        return <IndexPage navigate={setPage} />;
      case "user-login":
        return (
          <UserLogin
            navigate={setPage}
            onLoginSuccess={(email) => {
              setUserEmail(email);
              setPage("documentation");
            }}
          />
        );
      case "user-register":
        return <UserRegister navigate={setPage} />;
      case "admin-login":
        return (
          <AdminLogin
            navigate={setPage}
            onLoginSuccess={() => setPage("admin-dashboard")}
          />
        );
      case "admin-register":
        return <AdminRegister navigate={setPage} />;
      case "admin-dashboard":
        return (
          <AdminDashboard
            navigate={navigate}
            onLogout={handleAdminLogout}
          />
        );
      case "admin-loan-detail":
        return (
          <AdminLoanDetail
            navigate={navigate}
            loanId={adminLoanId}
            onBack={() => navigate("admin-dashboard")}
          />
        );
      case "documentation":
        return (
          <Documentation
            navigate={setPage}
            onLogout={handleLogout}
          />
        );
      case "user-dashboard":
        return (
          <UserDashboard
            navigate={navigate}
            userEmail={userEmail}
          />
        );
      case "user-analytics":
        return (
          <UserLoanAnalytics
            navigate={navigate}
            userEmail={userEmail}
          />
        );
      case "user-loan-detail":
        return (
          <UserLoanDetail
            navigate={navigate}
            userEmail={userEmail}
            loanId={userLoanId}
            onBack={() => navigate("user-dashboard")}
          />
        );
      case "apply-loan":
        return (
          <ApplyLoan
            navigate={navigate}
            userEmail={userEmail}
          />
        );
      default:
        return <IndexPage navigate={setPage} />;
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      {renderPage()}
    </>
  );
}
