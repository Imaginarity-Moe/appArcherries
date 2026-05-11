import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { AuthLayout } from "../components/Layout";

export default function Verify() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("fail");
      setMessage(t("verify.no_token"));
      return;
    }
    api(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => setState("ok"))
      .catch((err) => {
        setState("fail");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token, t]);

  return (
    <AuthLayout>
      <div className="card text-center animate-fade-in">
        {state === "loading" && (
          <>
            <Loader2 size={48} className="mx-auto text-copper-500 animate-spin mb-3" />
            <p className="text-forest-700">{t("verify.checking")}</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-forest-500 mb-3" />
            <h1 className="font-display text-2xl font-semibold mb-2">{t("verify.success_title")}</h1>
            <p className="text-forest-700 dark:text-forest-300 mb-5">{t("verify.success_text")}</p>
            <Link to="/login" className="btn tap-large">
              {t("verify.go_login")}
            </Link>
          </>
        )}
        {state === "fail" && (
          <>
            <XCircle size={48} className="mx-auto text-red-600 mb-3" />
            <h1 className="font-display text-2xl font-semibold mb-2">{t("verify.fail_title")}</h1>
            <p className="text-red-700">{message}</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
