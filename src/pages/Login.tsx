import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/Layout";

export default function Login() {
  const { t, i18n } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="card animate-fade-in">
        <h2 className="font-display text-lg font-semibold mb-5 tracking-tight">{t("login.title")}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary mb-1 block">{t("login.email")}</label>
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
            <label className="text-sm font-medium text-secondary mb-1 block">{t("login.password")}</label>
            <div className="relative">
              <input
                className="input pr-12"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-primary"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-cherry-50 dark:bg-cherry-900/30 border border-cherry-200 dark:border-cherry-800 text-cherry-700 dark:text-cherry-200 px-3 py-2 text-sm animate-slide-up">
              {error}
            </div>
          )}

          <button className="btn-accent w-full tap-large" disabled={busy}>
            {busy ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 items-center text-sm">
          <Link to="/forgot-password" className="text-secondary hover:text-primary">
            {t("login.forgot_password")}
          </Link>
          <div className="w-full flex items-center gap-3 text-muted">
            <span className="flex-1 hairline" />
            <span className="text-xs uppercase tracking-wider">oder</span>
            <span className="flex-1 hairline" />
          </div>
          <Link to="/register" className="text-secondary hover:text-primary">
            {t("login.no_account")} <span className="font-semibold text-primary">{t("login.create_account")}</span>
          </Link>
        </div>
      </div>

      <div className="text-center mt-6 text-sm text-muted">
        <button
          onClick={() => i18n.changeLanguage("de")}
          className={`px-2 transition ${i18n.language.startsWith("de") ? "text-primary font-semibold" : "hover:text-primary"}`}
        >
          DE
        </button>
        <span className="opacity-40">·</span>
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={`px-2 transition ${i18n.language.startsWith("en") ? "text-primary font-semibold" : "hover:text-primary"}`}
        >
          EN
        </button>
      </div>
    </AuthLayout>
  );
}
