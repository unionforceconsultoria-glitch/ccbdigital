import React, { createContext, useContext, useState, useCallback } from "react";

type UserRole = "user" | "admin" | null;

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem("ccb_role") as UserRole) || null;
  });

  const login = useCallback((username: string, password: string): boolean => {
    if (username === "Admin" && password === "123456") {
      setRole("admin");
      localStorage.setItem("ccb_role", "admin");
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    localStorage.removeItem("ccb_role");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: role !== null, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
