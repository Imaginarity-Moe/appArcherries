import { useEffect, useRef, useState } from "react";

/**
 * Pollt eine refresh-Funktion regelmäßig wenn aktiv.
 * Pausiert automatisch bei:
 * - Offline (kein Sinn zu pollen)
 * - Hidden Tab (Page Visibility API)
 *
 * Beendet sich nicht von selbst — Caller muss enabled=false setzen.
 */
export function useLivePolling(
  refresh: () => Promise<void>,
  enabled: boolean,
  intervalMs = 5000
): { isPolling: boolean; lastTickAt: number | null } {
  const [isPolling, setIsPolling] = useState(false);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const shouldPoll = () => navigator.onLine && !document.hidden;

    const tick = async () => {
      if (cancelled) return;
      if (shouldPoll()) {
        setIsPolling(true);
        try {
          await refreshRef.current();
          if (!cancelled) setLastTickAt(Date.now());
        } catch {
          // still throw silently — UI shows last known state
        } finally {
          if (!cancelled) setIsPolling(false);
        }
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, intervalMs);
      }
    };

    // Erster Tick verzögert (gibt initial-mount Zeit), dann periodisch
    timer = window.setTimeout(tick, intervalMs);

    // Bei Visibility-Wechsel: sofort einen Tick auslösen wenn wieder sichtbar
    const onVis = () => {
      if (!document.hidden && shouldPoll() && !cancelled) {
        if (timer !== null) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, intervalMs]);

  return { isPolling, lastTickAt };
}
