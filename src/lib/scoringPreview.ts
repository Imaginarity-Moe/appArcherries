import type { Discipline } from "../api/trainings";

/**
 * Frontend-Spiegel von api/lib/Scoring.php. Wird für Offline-Optimistic-Scoring
 * benutzt — Server berechnet beim Sync autoritativ neu.
 *
 * Drei Stellen müssen synchron bleiben:
 *  - api/lib/Scoring.php
 *  - src/lib/scoringPreview.ts (diese Datei)
 *  - src/pages/TrainingDetail.tsx::previewArrowPoints (0-indexed slot statt 1-indexed seq)
 */

const FIRST_HIT_DISCIPLINES: Discipline[] = ["3d_ifaa", "3d_ifaa_animal", "3d_bowhunter"];

export function scoreArrowSeq(
  discipline: Discipline,
  zone: string | null,
  arrowSeq: number,
  allZonesOrdered: (string | null)[],
  nfaa: boolean = false
): number {
  if (!zone || zone === "miss") return 0;

  const isInnerKill = ["inner_kill", "kill_inner", "X", "inner"].includes(zone);
  const isOuterKill = ["outer_kill", "kill_outer", "outer"].includes(zone);
  const isKillAny   = isInnerKill || isOuterKill || ["vital", "kill"].includes(zone);
  const isWound     = ["wound", "body"].includes(zone);

  // Erstpfeil-Disziplinen: nach erstem Treffer geben weitere Pfeile 0
  if (FIRST_HIT_DISCIPLINES.includes(discipline)) {
    const firstHitIndex = allZonesOrdered.findIndex((z) => z && z !== "miss");
    if (firstHitIndex !== arrowSeq - 1) return 0;
  }

  const slot = arrowSeq - 1;

  if (discipline === "3d_ifaa") {
    const t = [
      { inner: 20, outer: 18, wound: 16 },
      { inner: 14, outer: 12, wound: 10 },
      { inner: 8,  outer: 6,  wound: 4 },
    ];
    if (slot < 0 || slot > 2) return 0;
    if (isInnerKill) return t[slot].inner;
    if (isOuterKill) return t[slot].outer;
    if (isWound)     return t[slot].wound;
    return 0;
  }

  if (discipline === "3d_ifaa_hunter") {
    if (arrowSeq !== 1) return 0;
    if (isInnerKill) return 20;
    if (isOuterKill) return 17;
    if (isWound)     return 10;
    return 0;
  }

  if (discipline === "3d_ifaa_animal") {
    const t = [
      { kill: 20, wound: 18 },
      { kill: 16, wound: 14 },
      { kill: 12, wound: 10 },
    ];
    if (slot < 0 || slot > 2) return 0;
    let base = 0;
    if (isKillAny)    base = t[slot].kill;
    else if (isWound) base = t[slot].wound;
    return base > 0 && nfaa ? base + 1 : base;
  }

  if (discipline === "3d_bowhunter") {
    const t = [
      { kill: 5, wound: 3 },
      { kill: 4, wound: 2 },
      { kill: 3, wound: 1 },
    ];
    if (slot < 0 || slot > 2) return 0;
    if (isKillAny) return t[slot].kill;
    if (isWound)   return t[slot].wound;
    return 0;
  }

  if (discipline === "3d_wa") {
    if (zone === "X") return 11;
    const m: Record<string, number> = {
      kill_inner: 11, inner_kill: 11, inner: 10,
      kill_outer: 10, outer_kill: 10, outer: 8,
      body: 5, wound: 5,
    };
    return m[zone] ?? 0;
  }

  if (discipline === "field_wa") {
    if (zone === "X") return 6;
    const n = parseInt(zone, 10);
    return n >= 1 && n <= 6 ? n : 0;
  }

  if (discipline === "field_ifaa") {
    const n = parseInt(zone, 10);
    if (n === 5 || n === 4 || n === 3) return n;
    return 0;
  }

  return 0;
}

export function scoreTarget(
  discipline: Discipline,
  shots: Array<{ arrow_seq: number; zone: string | null }>,
  nfaa: boolean = false
): Array<{ arrow_seq: number; zone: string | null; points: number }> {
  const sorted = [...shots].sort((a, b) => a.arrow_seq - b.arrow_seq);
  const zones = sorted.map((s) => s.zone);
  return sorted.map((s) => ({
    arrow_seq: s.arrow_seq,
    zone: s.zone,
    points: scoreArrowSeq(discipline, s.zone, s.arrow_seq, zones, nfaa),
  }));
}
