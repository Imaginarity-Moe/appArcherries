import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function Verify() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("fail");
      setMessage("Kein Token in der URL.");
      return;
    }
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => {
        setState("ok");
      })
      .catch((err) => {
        setState("fail");
        setMessage(err instanceof Error ? err.message : "Verifizierung fehlgeschlagen");
      });
  }, [token]);

  return (
    <div className="card max-w-md mx-auto text-center">
      {state === "loading" && <p className="text-archer-700">Prüfe…</p>}
      {state === "ok" && (
        <>
          <h1 className="text-2xl font-semibold mb-2">E-Mail bestätigt</h1>
          <p className="text-archer-700 mb-4">Dein Konto ist jetzt aktiviert.</p>
          <Link to="/login" className="btn">
            Zum Login
          </Link>
        </>
      )}
      {state === "fail" && (
        <>
          <h1 className="text-2xl font-semibold mb-2">Bestätigung fehlgeschlagen</h1>
          <p className="text-red-600">{message}</p>
        </>
      )}
    </div>
  );
}
