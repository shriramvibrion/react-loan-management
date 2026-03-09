import { Component } from "react";

/**
 * Error boundary to catch rendering errors in child components.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error info in production — could send to monitoring service
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f8fafc, #eef2f7)",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "40px 32px",
              maxWidth: 480,
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 12,
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: "#312e81",
                marginBottom: 8,
              }}
            >
              Something went wrong
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#64748b",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred. Please try refreshing the page.
            </div>
            <button
              className="btn-blue"
              style={{ maxWidth: 200, margin: "0 auto" }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
