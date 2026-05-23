/**
 * Online-Status-Berechnung. "Online" wenn last_seen_at innerhalb 5 Minuten.
 * Helper für UI-Indikatoren — gibt's an vielen Stellen (Avatar, Listen, Modale).
 */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 Minuten

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_THRESHOLD_MS;
}

/**
 * Menschen-lesbares "zuletzt aktiv vor X" — kurz und auf Deutsch.
 * Format-Beispiele: "online", "vor 12 Min", "vor 3 Std", "gestern", "vor 5 Tagen".
 */
export function lastSeenLabel(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "noch nie";
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  if (diffMs < ONLINE_THRESHOLD_MS) return "online";
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 7) return `vor ${d} Tagen`;
  const w = Math.floor(d / 7);
  if (w < 5) return `vor ${w} ${w === 1 ? "Woche" : "Wochen"}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `vor ${m} ${m === 1 ? "Monat" : "Monaten"}`;
  return `vor mehr als einem Jahr`;
}
