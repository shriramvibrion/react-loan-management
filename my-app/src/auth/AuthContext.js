import { createContext, useContext, useState, useCallback, useEffect } from "react";
import config from "../config";
import { ROLES } from "../constants";

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = sessionStorage.getItem(config.SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    if (session) {
      sessionStorage.setItem(config.SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(config.SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

  useEffect(() => {
    saveSession(user);
  }, [user]);

  const login = useCallback((email, role = ROLES.USER) => {
    const session = { email, role, loginAt: Date.now() };
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem("ezl_apply_draft"); } catch { /* ignore */ }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isUser: user?.role === ROLES.USER,
    isAdmin: user?.role === ROLES.ADMIN,
    userEmail: user?.email || "",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
