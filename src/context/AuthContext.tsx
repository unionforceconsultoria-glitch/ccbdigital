import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type UserRole = "user" | "admin" | null;

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "ccb_admin_session";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "admin") setRole("admin");
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (username.trim() === "Admin" && password === "123456") {
      try { localStorage.setItem(STORAGE_KEY, "admin"); } catch {}
      setRole("admin");
      return { ok: true };
    }
    return { ok: false, error: "Credenciais inválidas." };
  }, []);

  const logout = useCallback(async () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: role === "admin",
        role,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
