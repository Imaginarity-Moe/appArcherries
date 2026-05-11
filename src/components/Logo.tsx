type Props = { size?: number; className?: string };

/**
 * Archerries Wordmark / Logo-Mark.
 * SVG: stilisierter Pfeilkopf mit Befiederung, daneben Wortmarke in Fraunces.
 */
export function LogoMark({ size = 40, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Pfeilkopf (Spitze + Schaft-Anfang) */}
      <path
        d="M24 4 L34 22 L29 22 L29 36 L19 36 L19 22 L14 22 Z"
        fill="currentColor"
      />
      {/* Befiederung */}
      <path
        d="M19 36 L13 44 L19 41 Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M29 36 L35 44 L29 41 Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M24 36 L24 44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={32} className="text-copper-500" />
      <span className="font-display text-2xl font-semibold text-forest-900 dark:text-forest-50">
        Archerries
      </span>
    </div>
  );
}
