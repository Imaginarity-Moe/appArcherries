import { useEffect, useRef } from "react";
import { subscribeDrained } from "./sync";

/**
 * Ruft den Callback auf, sobald die Sync-Engine erfolgreich Outbox-Einträge
 * an den Server gesendet hat. Pages nutzen das um nach einem Hintergrund-Sync
 * frische Server-Daten zu holen.
 */
export function useSyncListener(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return subscribeDrained(() => ref.current());
  }, []);
}
