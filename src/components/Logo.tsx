import logoLightUrl from "../assets/logo_light.svg";
import logoDarkUrl from "../assets/logo_dark.svg";
import logoFullLightUrl from "../assets/log_schriftzug_light.svg";
import logoFullDarkUrl from "../assets/log_schriftzug_dark.svg";
import wordmarkSvg from "../assets/schriftzug.svg?raw";

type Props = { size?: number; className?: string };

/**
 * Archerries Logo-Mark (Bogen mit Pfeil + Kirschen — Archer + Cherries).
 * Zwei Varianten — light wird im Light-Mode gezeigt, dark im Dark-Mode.
 * Statt invert/currentColor-Hack, weil die Cherry-Farbe der Kirschen erhalten
 * bleiben muss (würde durch invert in cyan kippen).
 */
export function LogoMark({ size = 40, className = "" }: Props) {
  return (
    <span
      className={`inline-block leading-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={logoLightUrl}
        alt=""
        draggable={false}
        className="block w-full h-full object-contain dark:hidden"
      />
      <img
        src={logoDarkUrl}
        alt=""
        draggable={false}
        className="hidden w-full h-full object-contain dark:block"
      />
    </span>
  );
}

/**
 * Logo + Schriftzug kombiniert (Symbol-mark links, Schriftzug rechts).
 * Für Auth-Seiten, Sidebar-Header etc. — Light/Dark-Varianten der gleichen
 * Datei, je nach Theme.
 */
export function LogoWordmark({ className = "h-9" }: { className?: string }) {
  return (
    <>
      <img
        src={logoFullLightUrl}
        alt="Archerries"
        draggable={false}
        className={`block w-auto object-contain dark:hidden ${className}`}
      />
      <img
        src={logoFullDarkUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`hidden w-auto object-contain dark:block ${className}`}
      />
    </>
  );
}

/** Internal: URLs für AuthLayout, das ein anderes Layout-Pattern braucht (full-bleed). */
export const _logoFullLightUrl = logoFullLightUrl;
export const _logoFullDarkUrl = logoFullDarkUrl;

/**
 * Nur Schriftzug (ohne Symbol) — für schmale Header wo das volle Logo zu groß wäre.
 * Default h-5 (~20px) matched die Icon-Höhe (Lucide 22px) im Mobile-Header.
 *
 * Wird inline gerendert (über ?raw), damit currentColor greift:
 * Buchstaben adoptieren text-primary (theme-aware), der rote i-Punkt
 * (#7a2532 hard-coded im SVG) bleibt unabhängig vom Theme cherry.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Archerries"
      className={`inline-block h-5 w-auto text-primary [&_svg]:h-full [&_svg]:w-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: wordmarkSvg }}
    />
  );
}
