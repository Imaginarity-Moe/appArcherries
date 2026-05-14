import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudUpload, Check, RefreshCw } from "lucide-react";
import { countPending, subscribeOutbox } from "../lib/outbox";
import { drain } from "../lib/sync";

/**
 * Kompaktes Online/Offline-Indicator-Icon für den Header.
 * Drei Zustände:
 * - Online + Outbox leer  → grünes Wifi-Icon (alles in Sync)
 * - Online + Pending Sync → kupfernes Cloud-Upload-Icon mit Badge (Anzahl)
 * - Offline               → rotes WifiOff-Icon
 *
 * Tap öffnet ein kleines Popover mit Details + manuellem Sync-Trigger.
 */
export default function NetworkStatusIcon() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const refresh = () => countPending().then(setPending).catch(() => {});
    refresh();
    const unsub = subscribeOutbox(refresh);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsub();
    };
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const result = await drain();
      if (result.sent > 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 1500);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Icon & Farbe je nach Zustand
  let icon = <Wifi size={20} />;
  let colorClass = "text-forest-500";
  let label = "Online";

  if (!online) {
    icon = <WifiOff size={20} />;
    colorClass = "text-red-600";
    label = "Offline";
  } else if (pending > 0) {
    icon = <CloudUpload size={20} className={syncing ? "animate-pulse" : ""} />;
    colorClass = "text-copper-600";
    label = `${pending} zu syncen`;
  } else if (justSynced) {
    icon = <Check size={20} />;
    colorClass = "text-forest-500";
    label = "Synchronisiert";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover((s) => !s)}
        className={`btn-icon ${colorClass} relative`}
        aria-label={label}
      >
        {icon}
        {pending > 0 && online && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-copper-600 text-white text-[10px] font-bold flex items-center justify-center">
            {pending > 9 ? "9+" : pending}
          </span>
        )}
        {!online && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-canvas dark:ring-canvas-dark" />
        )}
      </button>

      {showPopover && (
        <>
          {/* Backdrop zum Schließen */}
          <button
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
            aria-label="Schließen"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-elevated dark:bg-elevated-dark shadow-lift border border-forest-100 dark:border-forest-800 p-4 z-50 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className={colorClass}>{icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-forest-900 dark:text-forest-50">{label}</p>
                <p className="text-sm text-forest-700 dark:text-forest-300 mt-0.5">
                  {!online && "Änderungen werden lokal gespeichert und synchronisiert sobald die Verbindung zurück ist."}
                  {online && pending > 0 && "Pending Änderungen werden gleich gesendet."}
                  {online && pending === 0 && "Alle Daten sind synchronisiert."}
                </p>
              </div>
            </div>
            {online && pending > 0 && (
              <button
                onClick={() => {
                  triggerSync();
                  setShowPopover(false);
                }}
                disabled={syncing}
                className="btn w-full mt-3 text-sm"
              >
                Jetzt synchronisieren
              </button>
            )}
            {/* Reload-Button — wichtig in der installierten PWA, dort fehlt sonst der Browser-Reload */}
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost w-full mt-2 text-sm inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} strokeWidth={1.75} /> App neu laden
            </button>
          </div>
        </>
      )}
    </div>
  );
}
