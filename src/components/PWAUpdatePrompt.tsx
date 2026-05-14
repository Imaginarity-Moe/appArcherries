import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X, CheckCircle2 } from "lucide-react";

/**
 * Update- und Offline-Ready-Prompt.
 *
 * - needRefresh: prominenter Cherry-Banner oben (klare Handlungs-Aufforderung)
 * - offlineReady: dezenter Toast unten (informativ, kann ignoriert werden)
 *
 * Cherry statt rot — bewusst aufmerksam aber nicht alarmistisch.
 */
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

  // Offline-Ready-Toast verschwindet nach 5 Sekunden automatisch
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  return (
    <>
      {needRefresh && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-50 pt-safe animate-slide-up"
        >
          <div className="bg-cherry-500 text-cream shadow-lift">
            <div className="container-app py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-cherry-600/40 flex items-center justify-center shrink-0">
                <RefreshCw size={18} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">Neue Version verfügbar</p>
                <p className="text-xs opacity-85 mt-0.5">Lade neu für aktuelle Verbesserungen.</p>
              </div>
              <button
                onClick={() => updateServiceWorker(true)}
                className="rounded-full bg-cream text-cherry-700 font-semibold text-sm px-4 py-2 active:scale-95 transition shrink-0"
              >
                Jetzt
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="btn-icon text-cream shrink-0"
                aria-label="Schließen"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div className="fixed inset-x-4 bottom-24 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 z-40 animate-slide-up">
          <div className="rounded-2xl bg-elevated border border-hairline shadow-card p-4 flex items-start gap-3">
            <CheckCircle2 size={18} strokeWidth={1.75} className="text-cherry-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-primary">Bereit für Offline</p>
              <p className="text-xs text-secondary mt-0.5">Archerries lädt jetzt schneller — auch ohne Verbindung.</p>
            </div>
            <button
              onClick={() => setOfflineReady(false)}
              className="btn-icon shrink-0 -mt-1 -mr-1"
              aria-label="Schließen"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
