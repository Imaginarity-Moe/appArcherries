/**
 * Datum/Zeit-Formatierung mit Intl.
 * Verwendet die aktuelle i18next-Sprache, falls verfügbar; sonst Browser-Default.
 */
import i18n from "../i18n";

function locale(): string {
  return i18n.language || (typeof navigator !== "undefined" ? navigator.language : "de");
}

export function fmtDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === "string" ? new Date(iso.replace(" ", "T")) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(locale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function fmtDateTime(iso: string | Date): string {
  return fmtDate(iso, { hour: "2-digit", minute: "2-digit" });
}

export function fmtRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso.replace(" ", "T")) : iso;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
  if (diffDays === 0) return rtf.format(0, "day");
  if (diffDays === 1) return rtf.format(-1, "day");
  if (diffDays < 7) return rtf.format(-diffDays, "day");
  if (diffDays < 30) return rtf.format(-Math.floor(diffDays / 7), "week");
  if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), "month");
  return rtf.format(-Math.floor(diffDays / 365), "year");
}

export function fmtNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale(), opts).format(n);
}
