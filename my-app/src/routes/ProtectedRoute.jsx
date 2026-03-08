import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROUTES } from "../constants";

/**
 * Route guard component.
 * Redirects to login if not authenticated.
 * If requireAdmin is true, redirects non-admin users.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, isUser } = useAuth();

  if (!isAuthenticated) {
    const redirectTo = requireAdmin ? ROUTES.ADMIN_LOGIN : ROUTES.USER_LOGIN;
    return <Navigate to={redirectTo} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  if (!requireAdmin && !isUser && !isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
}
