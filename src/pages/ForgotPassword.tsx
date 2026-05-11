import { FormEvent, useState } from "react";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } finally {
      setDone(true);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Mail unterwegs</h1>
        <p className="text-archer-700">
          Falls ein Konto mit dieser Adresse existiert, haben wir einen Reset-Link
          gesendet.
        </p>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Passwort vergessen</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="input"
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn w-full" disabled={busy}>
          {busy ? "Lade…" : "Reset-Link senden"}
        </button>
      </form>
    </div>
  );
}
