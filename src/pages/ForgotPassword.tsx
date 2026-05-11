import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";
import { api } from "../api/client";
import { AuthLayout } from "../components/Layout";

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
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
      <AuthLayout>
        <div className="card text-center animate-fade-in">
          <MailCheck size={48} className="mx-auto text-copper-500 mb-3" />
          <h1 className="font-display text-2xl font-semibold mb-2">{t("forgot.done_title")}</h1>
          <p className="text-forest-700 dark:text-forest-300">{t("forgot.done_text")}</p>
          <Link to="/login" className="btn-ghost mt-5 inline-flex">
            ← {t("login.submit")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="card animate-fade-in">
        <h1 className="font-display text-2xl font-semibold mb-2">{t("forgot.title")}</h1>
        <p className="text-forest-700 dark:text-forest-300 mb-5">{t("forgot.subtitle")}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder={t("forgot.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn w-full tap-large" disabled={busy}>
            {busy ? t("forgot.submitting") : t("forgot.submit")}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
