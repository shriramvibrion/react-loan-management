import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Hook to handle logout with navigation.
 */
export default function useLogout(redirectPath = "/") {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return useCallback(() => {
    logout();
    navigate(redirectPath);
  }, [logout, navigate, redirectPath]);
}
