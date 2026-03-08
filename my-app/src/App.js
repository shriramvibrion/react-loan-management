import "./styles/global.css";
import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import AppRouter from "./routes/AppRouter";
import bgImage from "./images/img.png";

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
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
