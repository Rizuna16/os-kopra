import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { User } from "./types";
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  me as fetchMe,
} from "./authService";
import type { LoginInput, RegisterInput } from "./authService";
import { getRefreshToken, clearTokens } from "../lib/tokenStore";
import { setOnUnauthorized } from "../lib/apiClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (data: LoginInput) => Promise<User>;
  register: (data: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (data: LoginInput): Promise<User> => {
    const u = await authLogin(data);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      /* ignore network errors; local clear is the source of truth */
    }
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setOnUnauthorized(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let active = true;

    if (!getRefreshToken()) {
      setStatus("unauthenticated");
      return;
    }

    (async () => {
      try {
        const u = await fetchMe();
        if (active) {
          setUser(u);
          setStatus("authenticated");
        }
      } catch {
        if (active) {
          clearTokens();
          setStatus("unauthenticated");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    status,
    login,
    register: authRegister,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
