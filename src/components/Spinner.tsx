import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
  /** Sichtbares Label rechts neben dem Spinner. Default: nur Spinner + sr-only Label. */
  showLabel?: boolean;
};

/**
 * Inline-Spinner für Loading-States. Premium-minimal: Cherry-Akzent + currentColor.
 * sr-only Label für Screen-Reader; sichtbares Label optional.
 */
export function Spinner({ size = 18, label, className = "", showLabel = false }: SpinnerProps) {
  const { t } = useTranslation("common");
  const a11yLabel = label ?? t("actions.loading");
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-secondary ${className}`}
    >
      <Loader2
        size={size}
        strokeWidth={2.25}
        className="animate-spin text-cherry-500"
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="text-sm">{a11yLabel}</span>
      ) : (
        <span className="sr-only">{a11yLabel}</span>
      )}
    </span>
  );
}

/**
 * Vollflächiger Loading-Indikator für Page-Level-Wartezeiten (Auth, Lazy-Routes, Detail-Pages).
 * Vertikal + horizontal zentriert, großzügiges Padding.
 */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 px-8">
      <Spinner size={32} label={label} />
    </div>
  );
}
