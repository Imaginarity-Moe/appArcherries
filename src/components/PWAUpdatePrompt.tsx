import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.warn("[pwa] SW registration failed:", err);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 z-50 animate-slide-up">
      <div className="rounded-2xl bg-elevated dark:bg-elevated-dark shadow-lift border border-forest-100 dark:border-forest-800 p-4 flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold text-forest-900 dark:text-forest-50">
            {needRefresh ? "Neue Version verfügbar" : "Bereit für Offline"}
          </p>
          <p className="text-sm text-forest-700 dark:text-forest-300 mt-0.5">
            {needRefresh
              ? "Lade neu, um die aktuelle Version zu verwenden."
              : "Archerries lädt jetzt schneller — auch ohne Verbindung."}
          </p>
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="btn mt-3 inline-flex items-center gap-1.5 text-sm"
            >
              <RefreshCw size={14} /> Jetzt neu laden
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="btn-icon -mt-1 -mr-1 text-forest-700 dark:text-forest-300"
          aria-label="Schließen"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
