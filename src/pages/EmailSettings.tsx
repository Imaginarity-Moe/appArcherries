import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { api, setToken } from "../api/client";
import { AuthLayout } from "../components/Layout";
import { useAuth } from "../auth/AuthContext";
import { PageSpinner } from "../components/Spinner";
import type { User } from "../auth/AuthContext";

/**
 * Magic-Login-Landing für den DSGVO-Footer-Link in Mails.
 * Erwartet ?token=<signed-jwt>, tauscht ihn gegen ein 30-Tage-JWT und leitet
 * direkt zu /profile#notifications. Bei ungültigem Token: Fehler + Link zum Login.
 */
export default function EmailSettings() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Strict-Mode rendert useEffect doppelt — einmaliger Token-Tausch erzwingen.
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;
    if (!token) {
      setError("Kein Token in der URL.");
      return;
    }
    (async () => {
      try {
        const res = await api<{ token: string; user: User }>("/auth/email-settings", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setToken(res.token);
        await refresh();
        nav("/profile#notifications", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anmelden fehlgeschlagen");
      }
    })();
  }, [token, nav, refresh]);

  if (error) {
    return (
      <AuthLayout>
        <div className="card text-center animate-fade-in">
          <XCircle size={48} className="mx-auto text-cherry-500 mb-3" />
          <h1 className="font-display text-2xl font-semibold mb-2">Link abgelaufen</h1>
          <p className="text-secondary mb-5">{error}</p>
          <p className="text-sm text-muted">
            Bitte melde dich normal an und passe deine Benachrichtigungen unter <em>Profil → Benachrichtigungen</em> an.
          </p>
        </div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout>
      <PageSpinner />
    </AuthLayout>
  );
}
