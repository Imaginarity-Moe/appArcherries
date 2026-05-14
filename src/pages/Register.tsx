import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { api } from "../api/client";
import { AuthLayout } from "../components/Layout";

export default function Register() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
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
      <AuthLayout>
        <div className="card text-center animate-fade-in">
          <MailCheck size={48} className="mx-auto text-copper-500 mb-3" />
          <h1 className="font-display text-2xl font-semibold mb-2">{t("register.success_title")}</h1>
          <p className="text-forest-700 dark:text-forest-300">
            {t("register.success_text", { email })}
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>

      <div className="card animate-fade-in">
        <h2 className="font-display text-xl font-semibold mb-5">{t("register.title")}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("register.display_name")}
            </label>
            <input
              className="input"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("register.email")}
            </label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("register.password")}
            </label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
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
            <p className="text-xs text-forest-300 mt-1">{t("register.password_hint")}</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm animate-slide-up">
              {error}
            </div>
          )}

          <button className="btn w-full tap-large" disabled={busy}>
            {busy ? t("register.submitting") : t("register.submit")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          {t("register.have_account")}{" "}
          <Link to="/login" className="text-copper-500 hover:text-copper-700 font-semibold underline">
            {t("register.go_login")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
