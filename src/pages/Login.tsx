import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { LogoMark } from "../components/Logo";
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
      <div className="text-center mb-8">
        <LogoMark size={56} className="text-copper-500 mx-auto mb-3" />
        <h1 className="font-display text-3xl font-semibold text-forest-900 dark:text-forest-50">
          Archerries
        </h1>
        <p className="text-forest-700 dark:text-forest-300 mt-2">{t("login.subtitle")}</p>
      </div>

      <div className="card animate-fade-in">
        <h2 className="font-display text-xl font-semibold mb-5">{t("login.title")}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("login.email")}
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
              {t("login.password")}
            </label>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-forest-700 hover:text-copper-500"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm animate-slide-up">
              {error}
            </div>
          )}

          <button className="btn w-full tap-large" disabled={busy}>
            {busy ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-3 items-center text-sm">
          <Link to="/forgot-password" className="text-forest-700 hover:text-copper-500">
            {t("login.forgot_password")}
          </Link>
          <div className="w-full flex items-center gap-3 text-forest-300">
            <hr className="flex-1 border-forest-100" />
            <span className="text-xs">oder</span>
            <hr className="flex-1 border-forest-100" />
          </div>
          <Link to="/register" className="text-forest-700 hover:text-copper-500">
            {t("login.no_account")} <span className="font-semibold underline">{t("login.create_account")}</span>
          </Link>
        </div>
      </div>

      <div className="text-center mt-6 text-sm text-forest-300">
        <button
          onClick={() => i18n.changeLanguage("de")}
          className={`px-2 ${i18n.language.startsWith("de") ? "text-forest-700 font-semibold" : "hover:text-copper-500"}`}
        >
          DE
        </button>
        ·
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={`px-2 ${i18n.language.startsWith("en") ? "text-forest-700 font-semibold" : "hover:text-copper-500"}`}
        >
          EN
        </button>
      </div>
    </AuthLayout>
  );
}
