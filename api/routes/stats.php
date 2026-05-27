<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Scoring.php';

function handle_stats(string $method, string $path): void
{
    $user = require_auth();
    if ($method !== 'GET') res_error('Method not allowed', 405);

    $sub = substr($path, strlen('/stats'));
    if ($sub === '' || $sub === '/') {
        stats_overview($user['id']);
        return;
    }
    if (preg_match('#^/training/(\d+)$#', $sub, $m)) {
        stats_per_training($user['id'], (int)$m[1]);
        return;
    }
    if ($sub === '/heatmap') {
        stats_heatmap($user['id']);
        return;
    }
    if ($sub === '/mood') {
        stats_mood($user['id']);
        return;
    }
    res_error('Not found', 404);
}

/**
 * Stimmungs-Aggregation: Anzahl pro Mood + durchschnittlicher Summary-Score.
 * Liefert Korrelation Mood↔Score und Mood-Verteilung in einem Schritt.
 */
function stats_mood(int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT mood, COUNT(*) AS cnt,
                AVG(NULLIF(summary_score, 0)) AS avg_score
         FROM trainings
         WHERE user_id = ? AND mood IS NOT NULL AND mood != ""
         GROUP BY mood
         ORDER BY cnt DESC'
    );
    $stmt->execute([$user_id]);
    $rows = array_map(fn($r) => [
        'mood'      => (string)$r['mood'],
        'count'     => (int)$r['cnt'],
        'avg_score' => $r['avg_score'] !== null ? round((float)$r['avg_score'], 1) : null,
    ], $stmt->fetchAll());

    // Total-Counts für Prozent-Berechnung
    $stmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $total = (int)$stmt->fetchColumn();
    $with_mood = array_sum(array_column($rows, 'count'));

    res_json([
        'entries'         => $rows,
        'total_trainings' => $total,
        'with_mood'       => $with_mood,
    ]);
}

/**
 * Aggregierte Pad-Koordinaten für die Treffer-Heatmap.
 *
 * Query-Params:
 *  - group_by = "tier" (default) | "lane"
 *    tier = pro (animal_or_face, distance_m, discipline)
 *    lane = pro (parcours_id, animal_or_face, distance_m, discipline)
 *  - discipline = optionaler Filter
 *  - bow        = optionaler Filter
 *
 * Liefert pro Gruppe die Liste aller pad_x/pad_y/zone/points-Treffer.
 * Verworfen werden Shots ohne pad_x/pad_y oder ohne animal_or_face (target_practice
 * hat kein "Tier", deshalb pauschal nicht in der Heatmap — wird später separat
 * behandelt, wenn das Bedürfnis da ist).
 */
function stats_heatmap(int $user_id): void
{
    $group_by = req_query('group_by') ?: 'tier';
    if (!in_array($group_by, ['tier', 'lane'], true)) $group_by = 'tier';
    $disc = req_query('discipline');
    $bow  = req_query('bow');
    $parcours_id = req_query('parcours_id');

    $where = ['t.user_id = ?', 's.pad_x IS NOT NULL', 's.pad_y IS NOT NULL',
              'tt.animal_or_face IS NOT NULL', "tt.animal_or_face != ''"];
    $args  = [$user_id];
    if ($disc)        { $where[] = 't.discipline = ?'; $args[] = $disc; }
    if ($bow)         { $where[] = 't.bow_type = ?';   $args[] = $bow; }
    if ($parcours_id) { $where[] = 't.parcours_id = ?'; $args[] = (int)$parcours_id; }
    $wsql = implode(' AND ', $where);

    $stmt = db()->prepare(
        "SELECT t.discipline, t.parcours_id, p.name AS parcours_name,
                tt.animal_or_face, tt.distance_m,
                s.pad_x, s.pad_y, s.zone, s.points
         FROM shots s
         JOIN training_targets tt ON tt.id = s.target_id
         JOIN trainings t ON t.id = tt.training_id
         LEFT JOIN parcours p ON p.id = t.parcours_id
         WHERE $wsql
         ORDER BY tt.animal_or_face ASC, tt.distance_m ASC"
    );
    $stmt->execute($args);
    $rows = $stmt->fetchAll();

    $groups = [];
    foreach ($rows as $r) {
        $animal = $r['animal_or_face'];
        $distance = $r['distance_m'] !== null ? (float)$r['distance_m'] : null;
        $discipline = $r['discipline'];
        $parcours_id = $r['parcours_id'] !== null ? (int)$r['parcours_id'] : null;
        $parcours_name = $r['parcours_name'];

        if ($group_by === 'lane') {
            $key = ($parcours_id ?? 0) . '|' . $animal . '|' . ($distance ?? 'x') . '|' . $discipline;
            $label = ($parcours_name ?: 'Ohne Parcours') . ' · ' . $animal
                   . ($distance !== null ? ' @' . rtrim(rtrim(number_format($distance, 1, '.', ''), '0'), '.') . 'm' : '');
        } else {
            $key = $animal . '|' . ($distance ?? 'x') . '|' . $discipline;
            $label = $animal . ($distance !== null ? ' (' . rtrim(rtrim(number_format($distance, 1, '.', ''), '0'), '.') . 'm)' : '');
        }

        if (!isset($groups[$key])) {
            $groups[$key] = [
                'key'            => $key,
                'label'          => $label,
                'discipline'     => $discipline,
                'animal_or_face' => $animal,
                'distance_m'     => $distance,
                'parcours_id'    => $group_by === 'lane' ? $parcours_id : null,
                'parcours_name'  => $group_by === 'lane' ? $parcours_name : null,
                'shot_count'     => 0,
                'points'         => [],
            ];
        }
        $groups[$key]['shot_count']++;
        $groups[$key]['points'][] = [
            'pad_x'  => (float)$r['pad_x'],
            'pad_y'  => (float)$r['pad_y'],
            'zone'   => $r['zone'],
            'points' => (int)$r['points'],
        ];
    }

    // Sortieren: Gruppen mit meisten Shots zuerst
    $groups_arr = array_values($groups);
    usort($groups_arr, fn ($a, $b) => $b['shot_count'] <=> $a['shot_count']);

    res_json([
        'group_by' => $group_by,
        'groups'   => $groups_arr,
    ]);
}

function stats_overview(int $user_id): void
{
    $disc = req_query('discipline');
    $bow  = req_query('bow');

    $where = ['t.user_id = ?'];
    $args  = [$user_id];
    if ($disc) { $where[] = 't.discipline = ?'; $args[] = $disc; }
    if ($bow)  { $where[] = 't.bow_type = ?';   $args[] = $bow; }
    $wsql = implode(' AND ', $where);

    // Verlauf
    $stmt = db()->prepare(
        "SELECT t.id, t.started_at, t.discipline, t.bow_type,
                COALESCE(t.summary_score, COALESCE((SELECT SUM(s.points) FROM shots s JOIN training_targets tt ON tt.id = s.target_id WHERE tt.training_id = t.id), 0)) AS total_score
         FROM trainings t WHERE $wsql ORDER BY t.started_at ASC"
    );
    $stmt->execute($args);
    $trend = array_map(function ($r) {
        return [
            'id' => (int)$r['id'],
            'date' => $r['started_at'],
            'discipline' => $r['discipline'],
            'bow_type' => $r['bow_type'],
            'score' => (int)$r['total_score'],
        ];
    }, $stmt->fetchAll());

    // Zonen-Verteilung — getrennt nach Disziplin-Familie:
    //  3d_*  → animal/IFAA-Zonen (inner_kill, outer_kill, wound, miss)
    //  field_*, target_practice → numerische Ring-Zonen (10, 9, 8, …, X)
    // Damit werden inkompatible Zonen-Werte nicht gemischt aggregiert.
    $threeD_disciplines = "'3d_wa','3d_ifaa','3d_ifaa_hunter','3d_ifaa_animal','3d_bowhunter'";
    $tgt_disciplines    = "'field_wa','field_ifaa','target_practice'";
    $build_zone_dist = function (string $disc_in) use ($wsql, $args) {
        $stmt = db()->prepare(
            "SELECT s.zone, COUNT(*) AS cnt
             FROM shots s
             JOIN training_targets tt ON tt.id = s.target_id
             JOIN trainings t ON t.id = tt.training_id
             WHERE $wsql AND t.discipline IN ($disc_in)
               AND s.zone IS NOT NULL AND s.zone != ''
             GROUP BY s.zone ORDER BY cnt DESC"
        );
        $stmt->execute($args);
        $rows = $stmt->fetchAll();
        $total = array_sum(array_map(fn ($r) => (int)$r['cnt'], $rows));
        return array_map(function ($r) use ($total) {
            return [
                'zone'  => $r['zone'],
                'count' => (int)$r['cnt'],
                'pct'   => $total > 0 ? round((int)$r['cnt'] / $total, 4) : 0,
            ];
        }, $rows);
    };
    $zone_dist        = $build_zone_dist($threeD_disciplines);   // Tier-Zonen (3D)
    $zone_dist_target = $build_zone_dist($tgt_disciplines);      // Ring-Zonen (Scheibe)

    // Pfeil-Konsistenz (Ø pro arrow_seq)
    $stmt = db()->prepare(
        "SELECT s.arrow_seq, AVG(s.points) AS avg_pts, COUNT(*) AS cnt
         FROM shots s
         JOIN training_targets tt ON tt.id = s.target_id
         JOIN trainings t ON t.id = tt.training_id
         WHERE $wsql
         GROUP BY s.arrow_seq ORDER BY s.arrow_seq ASC"
    );
    $stmt->execute($args);
    $arrow_consistency = array_map(function ($r) {
        return [
            'arrow_seq' => (int)$r['arrow_seq'],
            'avg'       => round((float)$r['avg_pts'], 2),
            'count'     => (int)$r['cnt'],
        ];
    }, $stmt->fetchAll());

    // PBs pro Discipline+Bow (gesamt, über alle Parcours)
    $stmt = db()->prepare(
        "SELECT t.discipline, t.bow_type, MAX(
            COALESCE(t.summary_score, COALESCE((SELECT SUM(s.points) FROM shots s JOIN training_targets tt ON tt.id = s.target_id WHERE tt.training_id = t.id), 0))
         ) AS best
         FROM trainings t WHERE t.user_id = ?
         GROUP BY t.discipline, t.bow_type
         ORDER BY t.discipline, t.bow_type"
    );
    $stmt->execute([$user_id]);
    $pbs = array_map(function ($r) {
        return [
            'discipline' => $r['discipline'],
            'bow_type'   => $r['bow_type'],
            'best'       => (int)$r['best'],
        ];
    }, $stmt->fetchAll());

    // PBs pro Parcours+Discipline+Bow (eigene Bestleistung je Parcours)
    $stmt = db()->prepare(
        "SELECT t.parcours_id, p.name AS parcours_name, t.discipline, t.bow_type,
                MAX(COALESCE(t.summary_score, COALESCE((SELECT SUM(s.points) FROM shots s JOIN training_targets tt ON tt.id = s.target_id WHERE tt.training_id = t.id), 0))) AS best
         FROM trainings t
         LEFT JOIN parcours p ON p.id = t.parcours_id
         WHERE t.user_id = ? AND t.parcours_id IS NOT NULL
         GROUP BY t.parcours_id, t.discipline, t.bow_type
         HAVING best > 0
         ORDER BY best DESC
         LIMIT 30"
    );
    $stmt->execute([$user_id]);
    $pbs_parcours = array_map(function ($r) {
        return [
            'parcours_id'   => (int)$r['parcours_id'],
            'parcours_name' => $r['parcours_name'],
            'discipline'    => $r['discipline'],
            'bow_type'      => $r['bow_type'],
            'best'          => (int)$r['best'],
        ];
    }, $stmt->fetchAll());

    res_json([
        'trend'                  => $trend,
        'zone_distribution'        => $zone_dist,        // 3D-Disziplinen (Tier-Zonen)
        'zone_distribution_target' => $zone_dist_target, // Scheiben-Disziplinen (Ringe)
        'arrow_consistency'      => $arrow_consistency,
        'personal_bests'         => $pbs,
        'personal_bests_parcours'=> $pbs_parcours,
    ]);
}

function stats_per_training(int $user_id, int $training_id): void
{
    require_once __DIR__ . '/../lib/TrainingAccess.php';
    // Access-Check: Owner / Participant / Coach (zentral in TrainingAccess.php)
    if (!user_can_read_training($user_id, $training_id)) res_error('Not found', 404);
    $access = db()->prepare(
        'SELECT t.id, t.discipline, t.bow_type, t.started_at, t.summary_score,
                t.scoring_mode, t.num_ends, t.legs_to_win, t.sets_to_win,
                t.arrows_per_end, t.target_distance_m, t.target_rings
         FROM trainings t WHERE t.id = ?'
    );
    $access->execute([$training_id]);
    $t = $access->fetch();
    if (!$t) res_error('Not found', 404);

    // Alle Participants des Trainings
    $p_stmt = db()->prepare(
        'SELECT tp.id, tp.user_id, tp.role, u.display_name, u.role AS user_role
         FROM training_participants tp
         JOIN users u ON u.id = tp.user_id
         WHERE tp.training_id = ?
         ORDER BY tp.role = "owner" DESC, tp.joined_at ASC'
    );
    $p_stmt->execute([$training_id]);
    $participants = $p_stmt->fetchAll();

    // Alle Shots aller Participants in einem Schwung
    $stmt = db()->prepare(
        'SELECT tt.id, tt.target_index, tt.participant_id, s.arrow_seq, s.zone, s.points
         FROM training_targets tt
         LEFT JOIN shots s ON s.target_id = tt.id
         WHERE tt.training_id = ?
         ORDER BY tt.target_index ASC, s.arrow_seq ASC'
    );
    $stmt->execute([$training_id]);
    $rows = $stmt->fetchAll();

    // Pro Participant einen Stats-Block bauen
    $byPid = []; // pid => { stations, zones, arrows }
    foreach ($participants as $p) {
        $byPid[(int)$p['id']] = ['stations' => [], 'zones' => [], 'arrows' => []];
    }
    foreach ($rows as $r) {
        $pid = (int)$r['participant_id'];
        if (!isset($byPid[$pid])) continue;
        $bucket = &$byPid[$pid];
        $idx = (int)$r['target_index'];
        $pts = $r['points'] !== null ? (int)$r['points'] : 0;
        $bucket['stations'][$idx] = ($bucket['stations'][$idx] ?? 0) + $pts;
        if ($r['zone']) $bucket['zones'][$r['zone']] = ($bucket['zones'][$r['zone']] ?? 0) + 1;
        if ($r['arrow_seq'] !== null) {
            $seq = (int)$r['arrow_seq'];
            $bucket['arrows'][$seq] ??= ['sum' => 0, 'cnt' => 0];
            $bucket['arrows'][$seq]['sum'] += $pts;
            $bucket['arrows'][$seq]['cnt']++;
        }
        unset($bucket);
    }

    $build_block = function (array $stations, array $zones, array $arrows): array {
        ksort($stations);
        $stations_arr = [];
        foreach ($stations as $idx => $pts) {
            $stations_arr[] = ['station' => $idx, 'score' => $pts];
        }
        $zones_arr = [];
        $total_z = array_sum($zones);
        arsort($zones);
        foreach ($zones as $z => $c) {
            $zones_arr[] = ['zone' => $z, 'count' => $c, 'pct' => $total_z ? round($c / $total_z, 4) : 0];
        }
        $arrows_arr = [];
        ksort($arrows);
        foreach ($arrows as $seq => $a) {
            $arrows_arr[] = [
                'arrow_seq' => $seq,
                'avg'       => $a['cnt'] > 0 ? round($a['sum'] / $a['cnt'], 2) : 0,
                'count'     => $a['cnt'],
            ];
        }
        $total = array_sum(array_column($stations_arr, 'score'));
        $best  = $stations_arr ? max(array_column($stations_arr, 'score')) : 0;
        $worst = $stations_arr ? min(array_column($stations_arr, 'score')) : 0;
        return [
            'total_score'      => (int)$total,
            'station_count'    => count($stations_arr),
            'avg_per_station'  => count($stations_arr) ? round($total / count($stations_arr), 1) : 0,
            'best_station'     => $best,
            'worst_station'    => $worst,
            'stations'         => $stations_arr,
            'zone_distribution'=> $zones_arr,
            'arrow_consistency'=> $arrows_arr,
        ];
    };

    // Pro Participant ausgeben
    $participants_stats = [];
    $own_block = null;
    foreach ($participants as $p) {
        $pid = (int)$p['id'];
        $block = $byPid[$pid] ?? ['stations' => [], 'zones' => [], 'arrows' => []];
        $built = $build_block($block['stations'], $block['zones'], $block['arrows']);
        $entry = array_merge([
            'participant_id'   => $pid,
            'user_id'          => (int)$p['user_id'],
            'display_name'     => $p['display_name'],
            'user_role'        => $p['user_role'],
            'role'             => $p['role'],
            'is_self'          => (int)$p['user_id'] === $user_id,
        ], $built);
        $participants_stats[] = $entry;
        if ($entry['is_self']) $own_block = $built;
    }

    // Sets/Legs-Wertung bei target_practice
    $sets_legs = null;
    if (($t['scoring_mode'] ?? null) === 'legs' || ($t['scoring_mode'] ?? null) === 'sets') {
        $sets_legs = compute_sets_legs($participants_stats, (int)($t['num_ends'] ?? 0));
    }

    // Top-Level: own-Score (Backward-Compat). Falls User kein Participant
    // (z.B. Owner mit nur Gäste-Spielern), nimm das erste Stats-Set.
    $top = $own_block ?? ($participants_stats[0] ?? $build_block([], [], []));

    res_json([
        'training' => [
            'id'                 => (int)$t['id'],
            'discipline'         => $t['discipline'],
            'bow_type'           => $t['bow_type'],
            'started_at'         => $t['started_at'],
            'scoring_mode'       => $t['scoring_mode'] ?? null,
            'num_ends'           => isset($t['num_ends']) && $t['num_ends'] !== null ? (int)$t['num_ends'] : null,
            'legs_to_win'        => isset($t['legs_to_win']) && $t['legs_to_win'] !== null ? (int)$t['legs_to_win'] : null,
            'sets_to_win'        => isset($t['sets_to_win']) && $t['sets_to_win'] !== null ? (int)$t['sets_to_win'] : null,
            'arrows_per_end'     => isset($t['arrows_per_end']) && $t['arrows_per_end'] !== null ? (int)$t['arrows_per_end'] : null,
            'target_distance_m'  => isset($t['target_distance_m']) && $t['target_distance_m'] !== null ? (int)$t['target_distance_m'] : null,
            'target_rings'       => isset($t['target_rings']) && $t['target_rings'] !== null ? (int)$t['target_rings'] : null,
        ],
        // Backward-Compat: own-Stats top-level
        'total_score'       => $top['total_score'],
        'station_count'     => $top['station_count'],
        'avg_per_station'   => $top['avg_per_station'],
        'best_station'      => $top['best_station'],
        'worst_station'     => $top['worst_station'],
        'stations'          => $top['stations'],
        'zone_distribution' => $top['zone_distribution'],
        'arrow_consistency' => $top['arrow_consistency'],
        // Multi-Player-Vergleich
        'participants'      => $participants_stats,
        'sets_legs'         => $sets_legs,
    ]);
}

/**
 * Berechnet pro participant gewonnene Legs (höchste End-Summe gewinnt 1 Leg).
 * Bei sets-Modus zusätzlich pro Set die akkumulierten Legs.
 * Vereinfacht: jeder Set hat legs_to_win Legs; danach beginnt der nächste Set.
 */
function compute_sets_legs(array $participants_stats, int $num_ends): array
{
    $result = [];
    if ($num_ends <= 0) return $result;
    // Stations-Mapping: pid → end → points
    $perEnd = [];
    foreach ($participants_stats as $p) {
        $perEnd[$p['participant_id']] = [];
        foreach ($p['stations'] as $st) {
            $perEnd[$p['participant_id']][$st['station']] = $st['score'];
        }
    }
    // Pro Participant Legs zählen
    foreach ($participants_stats as $p) {
        $legs = 0;
        for ($e = 1; $e <= $num_ends; $e++) {
            // Alle Participants müssen scored haben für ein vergleichbares End
            $scores = [];
            foreach ($participants_stats as $other) {
                if (!isset($perEnd[$other['participant_id']][$e])) { $scores = []; break; }
                $scores[$other['participant_id']] = $perEnd[$other['participant_id']][$e];
            }
            if (!$scores) continue;
            $max = max($scores);
            $winners = array_keys($scores, $max, true);
            if (count($winners) === 1 && $winners[0] === $p['participant_id']) {
                $legs++;
            }
        }
        $result[] = [
            'participant_id' => $p['participant_id'],
            'legs_won'       => $legs,
        ];
    }
    return $result;
}
