import type { User } from "../auth/AuthContext";
import { isOnline } from "../lib/presence";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-24 h-24 text-2xl",
};

/** Größe des Online-Dots pro Avatar-Größe — proportional zur Avatar-Größe. */
const DOT_CLASSES: Record<Size, string> = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-2",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-5 h-5 border-[3px]",
};

function initials(name: string | null | undefined, email?: string): string {
  // Bevorzugt display_name: Mehrwort → erste Buchstaben (z.B. "Markus Mossig" → "MM"),
  // Einzelwort → nur ein Buchstabe (z.B. "Markus" → "M", nicht "MA").
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Fallback: erster Buchstabe der Email-local-part
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "?";
}

/**
 * Runder Avatar mit Initialen-Fallback.
 * Nutzt `currentColor` für den Initialen-Text, sodass die Farbe vom Parent geerbt wird.
 *
 * Optionaler `showPresence`-Prop rendert einen kleinen grünen Dot unten-rechts wenn
 * der User innerhalb der letzten ~5 Min eine authentifizierte Anfrage gemacht hat
 * (siehe lib/presence.ts). Default false um Bestandscode nicht aufzuhübschen.
 */
export default function Avatar({
  user,
  size = "md",
  className = "",
  showPresence = false,
}: {
  user?:
    | Pick<User, "display_name" | "email" | "avatar_url" | "last_seen_at">
    | { display_name: string | null; avatar_url?: string | null; email?: string; last_seen_at?: string | null }
    | null;
  size?: Size;
  className?: string;
  /** Wenn true und user.last_seen_at jüngst → grüner Online-Dot unten-rechts. */
  showPresence?: boolean;
}) {
  const url = user?.avatar_url ?? null;
  const online = showPresence && isOnline(user?.last_seen_at);
  const cls = `${SIZE_CLASSES[size]} rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center font-semibold tracking-tight ${className}`;

  const dot = online ? (
    <span
      className={`absolute bottom-0 right-0 ${DOT_CLASSES[size]} bg-emerald-500 border-canvas dark:border-canvas-dark rounded-full`}
      title="online"
      aria-label="online"
    />
  ) : null;

  // Wenn Dot oder kein-Avatar-Image: wir wrappen in einen relativen Container
  if (url) {
    if (!showPresence) {
      return (
        <span className={cls}>
          <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
        </span>
      );
    }
    return (
      <span className="relative inline-block">
        <span className={cls}>
          <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
        </span>
        {dot}
      </span>
    );
  }

  const fallback = (
    <span
      className={`${cls} bg-surface text-secondary border border-hairline`}
      aria-hidden
    >
      {initials(user?.display_name ?? null, "email" in (user ?? {}) ? (user as { email?: string }).email : undefined)}
    </span>
  );

  if (!showPresence) return fallback;
  return (
    <span className="relative inline-block">
      {fallback}
      {dot}
    </span>
  );
}
