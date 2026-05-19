import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, getToken, setToken } from "../api/client";

export type Role = "admin" | "user" | "guest";

export type User = {
  id: number;
  email: string;
  display_name: string | null;
  status: "pending" | "active";
  role: Role;
  avatar_url?: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>("/me");
      setUser(me);
      // Optimistic-Cache für /me — bei Backend-Hängern kann der User trotzdem rein.
      try { localStorage.setItem("archerries.me", JSON.stringify(me)); } catch {}
    } catch (err) {
      // Nur bei echter Auth-Fehlfunktion ausloggen (401/403).
      // Bei 5xx, 504, Network-Errors: Token bleibt + User-Cache wird benutzt,
      // sodass der User NICHT bei jedem IONOS-Hänger rausfliegt.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setToken(null);
        setUser(null);
        try { localStorage.removeItem("archerries.me"); } catch {}
      } else {
        try {
          const cached = localStorage.getItem("archerries.me");
          if (cached) setUser(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try { localStorage.removeItem("archerries.me"); } catch {}
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
