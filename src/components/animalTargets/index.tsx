import type { ReactNode } from "react";
import DickhornschafSvg from "./dickhornschaf";

export type AnimalTarget = {
  /** Anzeige-Name */
  label: string;
  /** SVG-ViewBox, idR 240×170 (Landscape) für 3D-Tiere */
  viewBox: string;
  /** SVG-Children — der innere Inhalt mit data-zone-Attributen */
  svg: ReactNode;
  /** Aliases — Strings (case-insensitive), die als animal_or_face auf dieses Target gemappt werden */
  aliases: string[];
};

/**
 * Registry aller bekannten Tier-Ziele. Beim Erfassen schaut TrainingDetail im
 * animal_or_face-Feld, ob es einen Match gibt, und rendert dann das AnimalTargetPad
 * statt des generischen BullseyePad.
 *
 * Neues Tier hinzufügen:
 *  1. SVG-Component unter src/components/animalTargets/<name>.tsx anlegen
 *     mit data-zone-Attributen auf jedem Pfad (inner_kill / outer_kill / wound)
 *  2. Hier registrieren mit aliases (deutsche und englische Schreibweise)
 */
export const ANIMAL_TARGETS: Record<string, AnimalTarget> = {
  dickhornschaf: {
    label: "Dickhornschaf",
    viewBox: "0 0 240 170",
    svg: <DickhornschafSvg />,
    aliases: ["dickhornschaf", "bighorn", "bighorn sheep", "muffel", "mufflon"],
  },
};

/**
 * Sucht passendes Animal-Target zu einem freitext animal_or_face.
 * Case-insensitive, Whitespace-trim, exakter Match auf aliases.
 */
export function matchAnimalTarget(animalOrFace: string | null | undefined): AnimalTarget | null {
  if (!animalOrFace) return null;
  const q = animalOrFace.trim().toLowerCase();
  if (!q) return null;
  for (const target of Object.values(ANIMAL_TARGETS)) {
    if (target.aliases.includes(q)) return target;
  }
  return null;
}
