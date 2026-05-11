import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Fast geschafft</h1>
        <p className="text-archer-700">
          Wir haben eine Bestätigungs-Mail an <b>{email}</b> gesendet. Bitte klicke
          den Link darin, um deinen Account zu aktivieren.
        </p>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Konto anlegen</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="input"
          type="text"
          placeholder="Anzeigename"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          className="input"
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Passwort (mind. 8 Zeichen)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn w-full" disabled={busy}>
          {busy ? "Lade…" : "Registrieren"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Schon registriert?{" "}
        <Link to="/login" className="text-archer-700 hover:underline">
          Einloggen
        </Link>
      </p>
    </div>
  );
}
