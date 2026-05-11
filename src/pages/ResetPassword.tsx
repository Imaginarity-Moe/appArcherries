import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { AuthLayout } from "../components/Layout";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="card text-center animate-fade-in">
          <CheckCircle2 size={48} className="mx-auto text-forest-500 mb-3" />
          <h1 className="font-display text-2xl font-semibold mb-4">{t("reset.done_title")}</h1>
          <Link to="/login" className="btn tap-large">
            {t("reset.go_login")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="card animate-fade-in">
        <h1 className="font-display text-2xl font-semibold mb-2">{t("reset.title")}</h1>
        <p className="text-forest-700 dark:text-forest-300 mb-5">{t("reset.subtitle")}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <input
              className="input pr-12"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t("reset.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-forest-700"
              aria-label="Toggle password visibility"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn w-full tap-large" disabled={busy || !token}>
            {busy ? t("reset.submitting") : t("reset.submit")}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
