import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "portfolio_auth";
const AUTH_EXPIRY_KEY = "portfolio_auth_expiry";
const EXPIRY_HOURS = 24; // Session expires after 24 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem(AUTH_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    if (authStatus === "true" && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        setIsAuthenticated(true);
      } else {
        // Session expired
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_EXPIRY_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    // Simple password check - in production this would be a server call
    const correctPassword = "portfolio2026";
    
    if (password === correctPassword) {
      const expiryTime = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
      localStorage.setItem(AUTH_KEY, "true");
      localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
