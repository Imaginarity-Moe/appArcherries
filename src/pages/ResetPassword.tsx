import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <h1 className="text-2xl font-semibold mb-2">Passwort gesetzt</h1>
        <Link to="/login" className="btn">
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Neues Passwort setzen</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="input"
          type="password"
          placeholder="Neues Passwort (mind. 8 Zeichen)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn w-full" disabled={busy || !token}>
          {busy ? "Lade…" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
