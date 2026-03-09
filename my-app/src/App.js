import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/global.css";
import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import Loader from "./components/ui/Loader";
import ProtectedRoute from "./components/routes/ProtectedRoute.jsx";
import bgImage from "./images/img.png";

// Lazy-loaded page components (Phase 10 — code splitting)
const IndexPage = lazy(() => import("./pages/IndexPage"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const UserRegister = lazy(() => import("./pages/UserRegister"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const Documentation = lazy(() => import("./pages/Documentation"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const UserLoanAnalytics = lazy(() => import("./pages/UserLoanAnalytics"));
const UserLoanDetail = lazy(() => import("./pages/UserLoanDetail"));
const ApplyLoan = lazy(() => import("./pages/ApplyLoan"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLoanDetail = lazy(() => import("./pages/AdminLoanDetail"));

// Fullscreen loading fallback for Suspense
function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc, #eef2f7)",
      }}
    >
      <Loader text="Loading..." size={36} />
    </div>
  );
}

// Page background layout (preserved from original)
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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <div style={{ "--page-bg-url": `url(${bgImage})` }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<IndexPage />} />
                <Route path="/user/login" element={<UserLogin />} />
                <Route path="/user/register" element={<UserRegister />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/register" element={<AdminRegister />} />

                {/* Protected user routes */}
                <Route
                  path="/documentation"
                  element={
                    <ProtectedRoute>
                      <Documentation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/analytics"
                  element={
                    <ProtectedRoute>
                      <UserLoanAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/loan/:loanId"
                  element={
                    <ProtectedRoute>
                      <UserLoanDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/apply"
                  element={
                    <ProtectedRoute>
                      <ApplyLoan />
                    </ProtectedRoute>
                  }
                />

                {/* Protected admin routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/loan/:loanId"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLoanDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
