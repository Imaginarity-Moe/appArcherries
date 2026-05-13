import type { Discipline } from "../api/trainings";

/**
 * Lokale Wertungs-Vorschau. Identisch zu api/lib/Scoring.php, damit Offline-Caches
 * realistische Punkte zeigen, bevor der Server beim nächsten Sync autoritativ neu berechnet.
 */
export function scoreArrowSeq(
  discipline: Discipline,
  zone: string | null,
  arrowSeq: number,
  allZonesOrdered: (string | null)[]
): number {
  if (!zone || zone === "miss") return 0;

  if (discipline === "3d_ifaa") {
    const firstHitIndex = allZonesOrdered.findIndex((z) => z && z !== "miss");
    if (firstHitIndex !== arrowSeq - 1) return 0;
    const isVital = ["X", "kill", "inner", "vital"].includes(zone);
    if (arrowSeq === 1) return isVital ? 20 : 18;
    if (arrowSeq === 2) return isVital ? 16 : 14;
    if (arrowSeq === 3) return isVital ? 12 : 10;
    return 0;
  }

  if (discipline === "3d_bowhunter") {
    // IFAA Bowhunter Round: 3 Pfeile, nur erster treffender zählt. Vital 5/4/3, Wound 3/2/1.
    const firstHitIndex = allZonesOrdered.findIndex((z) => z && z !== "miss");
    if (firstHitIndex !== arrowSeq - 1) return 0;
    const isVital = ["X", "kill", "inner", "vital"].includes(zone);
    if (arrowSeq === 1) return isVital ? 5 : 3;
    if (arrowSeq === 2) return isVital ? 4 : 2;
    if (arrowSeq === 3) return isVital ? 3 : 1;
    return 0;
  }

  if (discipline === "3d_wa") {
    const m: Record<string, number> = { X: 11, kill: 11, inner: 10, outer: 8, body: 5 };
    return m[zone] ?? 0;
  }

  if (discipline === "field_wa") {
    if (zone === "X") return 6;
    const n = parseInt(zone, 10);
    return n >= 1 && n <= 6 ? n : 0;
  }

  return 0;
}

/** Berechnet Punkte für alle Pfeile eines Ziels gemeinsam (wichtig für IFAA-Sequenz-Logik). */
export function scoreTarget(
  discipline: Discipline,
  shots: Array<{ arrow_seq: number; zone: string | null }>
): Array<{ arrow_seq: number; zone: string | null; points: number }> {
  const sorted = [...shots].sort((a, b) => a.arrow_seq - b.arrow_seq);
  const zones = sorted.map((s) => s.zone);
  return sorted.map((s) => ({
    arrow_seq: s.arrow_seq,
    zone: s.zone,
    points: scoreArrowSeq(discipline, s.zone, s.arrow_seq, zones),
  }));
}
