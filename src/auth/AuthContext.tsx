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
import { subscribeDrained } from "../lib/sync";

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
  /** Wird vom AvatarUploader gesetzt, wenn der Upload offline in upload_outbox liegt.
   *  Solange gesetzt, überschreibt der blob: URL die avatar_url im user-Objekt. */
  setPendingAvatar: (blobUrl: string) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAvatarUrl, setPendingAvatarUrlState] = useState<string | null>(null);

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

  // Wenn ein pendender Avatar-Upload synct, /me neu holen — der server liefert dann
  // den echten avatar_url, und das useEffect unten räumt den blob: URL ab.
  useEffect(() => {
    if (!pendingAvatarUrl) return;
    return subscribeDrained(() => {
      refresh().catch(() => {});
    });
  }, [pendingAvatarUrl, refresh]);

  // Sobald der server-avatar_url != pending-blob-URL geworden ist (was nach Sync passiert):
  // blob freigeben, pending leeren.
  useEffect(() => {
    if (!pendingAvatarUrl) return;
    if (user?.avatar_url && !user.avatar_url.startsWith("blob:") && user.avatar_url !== pendingAvatarUrl) {
      URL.revokeObjectURL(pendingAvatarUrl);
      setPendingAvatarUrlState(null);
    }
  }, [user?.avatar_url, pendingAvatarUrl]);

  const setPendingAvatar = useCallback((blobUrl: string) => {
    setPendingAvatarUrlState((prev) => {
      if (prev && prev !== blobUrl) URL.revokeObjectURL(prev);
      return blobUrl;
    });
  }, []);

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
    setPendingAvatarUrlState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try { localStorage.removeItem("archerries.me"); } catch {}
  }, []);

  // user-Objekt mit pendingAvatarUrl überschrieben, damit alle Avatar-Stellen automatisch den Preview sehen.
  const effectiveUser = useMemo<User | null>(() => {
    if (!user) return null;
    if (pendingAvatarUrl) return { ...user, avatar_url: pendingAvatarUrl };
    return user;
  }, [user, pendingAvatarUrl]);

  const value = useMemo(
    () => ({ user: effectiveUser, loading, login, logout, refresh, setPendingAvatar }),
    [effectiveUser, loading, login, logout, refresh, setPendingAvatar]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
