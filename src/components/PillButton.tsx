import { ReactNode } from "react";

type PillSize = "xs" | "sm" | "md";
type PillVariant = "solid" | "tinted";

const SIZE: Record<PillSize, string> = {
  xs: "px-2 py-0.5 text-[11px]",
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-4 py-2 text-sm",
};

/**
 * Wiederverwendbarer Pill-Button (rounded-full).
 *
 * - `variant="solid"` (default): aktiv = Cherry-Fill (kräftiger Akzent).
 *   Für primäre Tab-Auswahl wie „Global / Freunde / Verein" in HighscoreCard.
 * - `variant="tinted"`: aktiv = Cherry-100 mit Border + Cherry-700-Text.
 *   Sekundäre Auswahl, z.B. Zeitraum-Filter „30 Tage / Jahr / Alle".
 *
 * Inaktiv: zurückhaltend (text-secondary, hover→primary).
 * Premium-Direktive: kein Glow, dezente Transition, taktiles Press-Feedback.
 */
export function PillButton({
  active,
  onClick,
  children,
  size = "sm",
  variant = "solid",
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: PillSize;
  variant?: PillVariant;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const activeCls =
    variant === "solid"
      ? "bg-cherry-500 text-cream"
      : "bg-cherry-100 text-cherry-700 dark:bg-cherry-900/40 dark:text-cherry-200 border border-cherry-300 dark:border-cherry-700";
  const idleCls =
    variant === "solid"
      ? "text-secondary hover:text-primary"
      : "bg-surface text-secondary border border-hairline hover:text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-full font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${SIZE[size]} ${
        active ? activeCls : idleCls
      } ${className}`}
    >
      {children}
    </button>
  );
}
