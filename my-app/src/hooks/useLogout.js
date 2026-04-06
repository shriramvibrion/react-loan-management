import { useCallback } from "react";
import { useAuth } from "../auth/AuthContext";

/**
 * Hook to handle logout with navigation.
 * @param {Function} navigate - Navigation function from parent component
 * @param {string} redirectPath - Page name to navigate to after logout (default: "index")
 */
export default function useLogout(navigate, redirectPath = "index") {
  const { logout } = useAuth();

  return useCallback(() => {
    logout();
    if (navigate) navigate(redirectPath);
  }, [logout, navigate, redirectPath]);
}
