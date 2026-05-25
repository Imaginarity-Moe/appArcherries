import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { getAchievements } from "../api/achievements";
import { subscribeDrained } from "./sync";

/**
 * Holt im Hintergrund die Achievement-Liste und zeigt Toast für jedes
 * gerade-neu-freigeschaltete Item (is_new=true). Triggert:
 *  - beim ersten Render (zur App-Wake-Up-Anzeige)
 *  - nach jedem Sync-Drain mit >=1 gesendetem Eintrag
 *
 * Doppel-Anzeigen werden vermieden via Set der bereits gezeigten Keys
 * (im aktuellen Tab — bei Reload wird das zurückgesetzt, aber der
 * Backend-is_new-Flag verhindert eine Doppelung).
 */
export function useAchievementWatcher(): void {
  const { user } = useAuth();
  const { showToast } = useToast();
  const shownKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return; // nicht eingeloggt → keine Polls

    const check = async () => {
      try {
        const r = await getAchievements();
        for (const a of r.achievements) {
          if (a.is_new && !shownKeys.current.has(a.key)) {
            shownKeys.current.add(a.key);
            showToast({
              icon: a.icon,
              title: `Neuer Erfolg: ${a.label}`,
              body: a.desc,
              variant: "cherry",
              href: "/profile",
              duration: 8000,
            });
          }
        }
      } catch { /* still — Background-Polling darf nicht blocken */ }
    };

    // Initial-Check ein bisschen verzögert (3s), damit Dashboard zuerst lädt
    const t = setTimeout(check, 3000);
    // Re-Check nach jedem erfolgreichen Sync-Drain
    const unsub = subscribeDrained(check);

    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [user, showToast]);
}
