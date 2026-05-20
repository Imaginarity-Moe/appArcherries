<?php
declare(strict_types=1);

/**
 * Wertungslogik für alle Disziplinen.
 *
 * Disziplin-IDs:
 *  - 3d_wa            : 2 Pfeile, beide zählen. 11/10/8/5/0. Linie zählt höher.
 *  - 3d_ifaa          : 3 Pfeile, nur Erstpfeil. Inner Kill / Outer Kill / Wound:
 *                       1. Pfeil: 20/18/16 | 2. Pfeil: 14/12/10 | 3. Pfeil: 8/6/4
 *  - 3d_ifaa_hunter   : 1 Pfeil. Inner Kill 20 / Outer Kill 17 / Wound 10 / Miss 0
 *  - 3d_ifaa_animal   : 3 Pfeile, nur Erstpfeil. Kill (Vital) / Wound:
 *                       1. Pfeil: 20/18 | 2. Pfeil: 16/14 | 3. Pfeil: 12/10
 *                       NFAA-Modus: +1 Bonus auf alle Trefferzonen (21/19, 17/15, 13/11)
 *  - 3d_bowhunter     : 3 Pfeile, nur Erstpfeil. Vital 5/4/3, Wound 3/2/1 (Liga-Variante)
 *  - field_wa         : 4 Pfeile pro Auflage, alle zählen. X=6 (Tie-Break), 6/5/4/3/2/1/0
 *  - field_ifaa       : 4 Pfeile pro Auflage, alle zählen. 5/4/3/0
 *  - simple           : nur Gesamt-Score
 *
 * Drei-Stellen-Sync-Pflicht bei Änderungen: Scoring.php, scoringPreview.ts, previewArrowPoints (TrainingDetail.tsx).
 */

/** Erstpfeil-Logik: nur der erste treffende Pfeil zählt. Disziplinen die das nutzen. */
const FIRST_HIT_DISCIPLINES = ['3d_ifaa', '3d_ifaa_animal', '3d_bowhunter'];

/**
 * Bewertet alle Pfeile eines Ziels.
 *
 * @param string $discipline
 * @param array<int,array{arrow_seq:int, zone:?string, x_norm?:?float, y_norm?:?float, pad_x?:?float, pad_y?:?float}> $shots
 * @param bool $nfaa  NFAA-Modus-Toggle (relevant nur für 3d_ifaa_animal)
 * @return array<int,array{arrow_seq:int, zone:?string, points:int, x_norm?:?float, y_norm?:?float, pad_x?:?float, pad_y?:?float}>
 */
function score_target(string $discipline, array $shots, bool $nfaa = false): array
{
    usort($shots, fn($a, $b) => (int)$a['arrow_seq'] <=> (int)$b['arrow_seq']);

    if (in_array($discipline, FIRST_HIT_DISCIPLINES, true)) {
        // Erstpfeil-Logik: nach erstem Treffer = 0 für alle weiteren
        $hit_seen = false;
        foreach ($shots as &$s) {
            if ($hit_seen) {
                $s['points'] = 0;
                continue;
            }
            $s['points'] = score_arrow_seq($discipline, (string)($s['zone'] ?? ''), (int)$s['arrow_seq'], $nfaa);
            if ($s['points'] > 0) $hit_seen = true;
        }
        unset($s);
        return $shots;
    }

    // Independent: jeder Pfeil zählt
    foreach ($shots as &$s) {
        $s['points'] = score_arrow_independent($discipline, (string)($s['zone'] ?? ''));
    }
    unset($s);
    return $shots;
}

/** Wertung für Disziplinen ohne Erstpfeil-Logik (3d_wa, field_wa, field_ifaa). */
function score_arrow_independent(string $discipline, string $zone): int
{
    $zone = strtolower(trim($zone));
    if ($zone === '' || $zone === 'miss' || $zone === 'm' || $zone === '0') return 0;

    switch ($discipline) {
        case '3d_wa':
            return match ($zone) {
                'x', 'kill', 'kill_inner', 'inner_kill', 'inner' => 11,  // innerstes Kill / 11
                'kill_outer', 'outer_kill', 'second', 'ten'      => 10,  // zweiter Ring / 10
                'outer', 'eight'                                  => 8,  // äußerer Ring / 8
                'body', 'wound', 'five'                           => 5,  // Körper / 5
                default                                            => 0,
            };

        case 'field_wa':
            // X (Center) zählt als 6 — wird vom Backend nur für Punkte gerechnet; Tracking als separates "X" passiert via zone='X' in DB
            if ($zone === 'x') return 6;
            $n = (int)$zone;
            return ($n >= 1 && $n <= 6) ? $n : 0;

        case 'field_ifaa':
            // 5 / 4 / 3 / 0
            if ($zone === 'x' || $zone === '5' || $zone === 'inner' || $zone === 'center') return 5;
            if ($zone === '4' || $zone === 'middle' || $zone === 'mid')                    return 4;
            if ($zone === '3' || $zone === 'outer')                                         return 3;
            return 0;

        case 'target_practice':
            // WA-Standard: zone ist der Ring-Wert als String ('1'..'10' oder 'X' für inner-10).
            // Punkte = numerischer Wert; X zählt wie 10 (Tiebreaker später separat tracken).
            if ($zone === 'x') return 10;
            $n = (int)$zone;
            return ($n >= 1 && $n <= 12) ? $n : 0;

        default:
            return 0;
    }
}

/** Wertung für Erstpfeil-Disziplinen + Single-Arrow-Hunter (Pfeil-Sequenz beeinflusst Punkte). */
function score_arrow_seq(string $discipline, string $zone, int $seq, bool $nfaa = false): int
{
    $zone = strtolower(trim($zone));
    if ($zone === '' || $zone === 'miss' || $zone === 'm' || $zone === '0') return 0;

    // Zonen-Klassifizierung
    $is_inner_kill = in_array($zone, ['inner_kill', 'kill_inner', 'x', 'inner'], true);
    $is_outer_kill = in_array($zone, ['outer_kill', 'kill_outer', 'outer'], true);
    $is_kill_any   = in_array($zone, ['vital', 'kill', 'inner_kill', 'kill_inner', 'outer_kill', 'kill_outer', 'x', 'inner', 'outer'], true);
    $is_wound      = in_array($zone, ['wound', 'body'], true);

    if ($discipline === '3d_ifaa') {
        // Drei Zonen: Inner Kill / Outer Kill / Wound
        // 1: 20/18/16  2: 14/12/10  3: 8/6/4
        $table = [
            1 => ['inner' => 20, 'outer' => 18, 'wound' => 16],
            2 => ['inner' => 14, 'outer' => 12, 'wound' => 10],
            3 => ['inner' => 8,  'outer' => 6,  'wound' => 4],
        ];
        if (!isset($table[$seq])) return 0;
        if ($is_inner_kill) return $table[$seq]['inner'];
        if ($is_outer_kill) return $table[$seq]['outer'];
        if ($is_wound)      return $table[$seq]['wound'];
        return 0;
    }

    if ($discipline === '3d_ifaa_hunter') {
        // Genau 1 Pfeil. Inner Kill 20 / Outer Kill 17 / Wound 10
        if ($seq !== 1) return 0; // weitere Pfeile sind sowieso nicht vorgesehen
        if ($is_inner_kill) return 20;
        if ($is_outer_kill) return 17;
        if ($is_wound)      return 10;
        return 0;
    }

    if ($discipline === '3d_ifaa_animal') {
        // Zwei Zonen: Kill (Vital) / Wound — Inner/Outer-Unterscheidung nicht relevant
        // 1: 20/18  2: 16/14  3: 12/10
        // NFAA-Toggle: +1 auf jeden Treffer
        $table = [
            1 => ['kill' => 20, 'wound' => 18],
            2 => ['kill' => 16, 'wound' => 14],
            3 => ['kill' => 12, 'wound' => 10],
        ];
        if (!isset($table[$seq])) return 0;
        $base = 0;
        if ($is_kill_any) $base = $table[$seq]['kill'];
        elseif ($is_wound) $base = $table[$seq]['wound'];
        return $base > 0 && $nfaa ? $base + 1 : $base;
    }

    if ($discipline === '3d_bowhunter') {
        // Liga-Variante: Vital 5/4/3, Wound 3/2/1
        $table = [
            1 => ['kill' => 5, 'wound' => 3],
            2 => ['kill' => 4, 'wound' => 2],
            3 => ['kill' => 3, 'wound' => 1],
        ];
        if (!isset($table[$seq])) return 0;
        if ($is_kill_any) return $table[$seq]['kill'];
        if ($is_wound)    return $table[$seq]['wound'];
        return 0;
    }

    return 0;
}

/**
 * Aggregiert die Gesamtpunkte aller Ziele eines Trainings.
 *
 * @param array<int,array{shots:array<int,array{arrow_seq:int,zone:?string}>}> $targets
 */
function compute_training_total(string $discipline, array $targets, bool $nfaa = false): int
{
    $sum = 0;
    foreach ($targets as $t) {
        foreach (score_target($discipline, $t['shots'] ?? [], $nfaa) as $s) {
            $sum += (int)$s['points'];
        }
    }
    return $sum;
}
