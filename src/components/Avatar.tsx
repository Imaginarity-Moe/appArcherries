import type { User } from "../auth/AuthContext";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-24 h-24 text-2xl",
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
 */
export default function Avatar({
  user,
  size = "md",
  className = "",
}: {
  user?: Pick<User, "display_name" | "email" | "avatar_url"> | { display_name: string | null; avatar_url?: string | null; email?: string } | null;
  size?: Size;
  className?: string;
}) {
  const url = user?.avatar_url ?? null;
  const cls = `${SIZE_CLASSES[size]} rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center font-semibold tracking-tight ${className}`;
  if (url) {
    return (
      <span className={cls}>
        <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
      </span>
    );
  }
  return (
    <span
      className={`${cls} bg-surface text-secondary border border-hairline`}
      aria-hidden
    >
      {initials(user?.display_name ?? null, "email" in (user ?? {}) ? (user as { email?: string }).email : undefined)}
    </span>
  );
}
