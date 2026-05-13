<?php
declare(strict_types=1);

/**
 * Berechnet die Punkte für eine Liste von Pfeilen an einem Ziel,
 * unter Berücksichtigung des Wertungssystems.
 *
 * Wichtig: bei IFAA-Systemen hängt die Wertung von der Pfeilreihenfolge ab —
 * deshalb müssen alle Pfeile eines Ziels gemeinsam bewertet werden.
 *
 * @param string $discipline '3d_wa' | '3d_ifaa' | '3d_bowhunter' | 'field_wa' | 'simple'
 * @param array<int,array{arrow_seq:int, zone:?string}> $shots
 * @return array<int,array{arrow_seq:int, zone:?string, points:int}>
 */
function score_target(string $discipline, array $shots): array
{
    usort($shots, fn($a, $b) => (int)$a['arrow_seq'] <=> (int)$b['arrow_seq']);

    if ($discipline === '3d_ifaa' || $discipline === '3d_bowhunter') {
        // Nur der erste treffende Pfeil zählt; nachfolgende = 0
        $hit_seen = false;
        foreach ($shots as &$s) {
            if ($hit_seen) {
                $s['points'] = 0;
                continue;
            }
            $s['points'] = score_arrow_seq($discipline, (string)($s['zone'] ?? ''), (int)$s['arrow_seq']);
            if ($s['points'] > 0) $hit_seen = true;
        }
        unset($s);
        return $shots;
    }

    // 3D-WA, Feldbogen: jeder Pfeil zählt unabhängig
    foreach ($shots as &$s) {
        $s['points'] = score_arrow_independent($discipline, (string)($s['zone'] ?? ''));
    }
    unset($s);
    return $shots;
}

function score_arrow_independent(string $discipline, string $zone): int
{
    $zone = strtolower(trim($zone));
    if ($zone === '' || $zone === 'miss' || $zone === '0' || $zone === 'm') return 0;

    switch ($discipline) {
        case 'field_wa':
            if ($zone === 'x') return 6;            // Center-X = 6 (Tie-Break-Marker)
            $n = (int)$zone;
            return ($n >= 1 && $n <= 6) ? $n : 0;

        case '3d_wa':
            return match ($zone) {
                'x', 'kill', 'kill_inner', 'inner_kill' => 11,
                'inner', 'kill_outer'                   => 10,
                'outer'                                 => 8,
                'body'                                  => 5,
                default                                 => 0,
            };

        default:
            return 0;
    }
}

function score_arrow_seq(string $discipline, string $zone, int $seq): int
{
    $zone = strtolower(trim($zone));
    if ($zone === '' || $zone === 'miss' || $zone === '0' || $zone === 'm') return 0;

    // Vital = innere Treffer (Kill, X, Inner); Wound = äußere Treffer (Outer, Body)
    $is_vital = in_array($zone, ['x', 'vital', 'kill', 'inner', 'kill_inner', 'kill_outer'], true);

    if ($discipline === '3d_ifaa') {
        return match (true) {
            $is_vital  && $seq === 1 => 20,
            $is_vital  && $seq === 2 => 16,
            $is_vital  && $seq === 3 => 12,
            !$is_vital && $seq === 1 => 18,
            !$is_vital && $seq === 2 => 14,
            !$is_vital && $seq === 3 => 10,
            default                  => 0,
        };
    }

    if ($discipline === '3d_bowhunter') {
        // IFAA Bowhunter Round: 3 Pfeile, nur erster treffender zählt.
        // Vital 5/4/3, Wound 3/2/1 je nach Pfeil-Nummer.
        return match (true) {
            $is_vital  && $seq === 1 => 5,
            $is_vital  && $seq === 2 => 4,
            $is_vital  && $seq === 3 => 3,
            !$is_vital && $seq === 1 => 3,
            !$is_vital && $seq === 2 => 2,
            !$is_vital && $seq === 3 => 1,
            default                  => 0,
        };
    }

    return 0;
}

/**
 * Aggregiert die Gesamtpunkte aller Ziele eines Trainings.
 *
 * @param string $discipline
 * @param array<int,array{shots:array<int,array{arrow_seq:int,zone:?string}>}> $targets
 */
function compute_training_total(string $discipline, array $targets): int
{
    $sum = 0;
    foreach ($targets as $t) {
        foreach (score_target($discipline, $t['shots'] ?? []) as $s) {
            $sum += (int)$s['points'];
        }
    }
    return $sum;
}
