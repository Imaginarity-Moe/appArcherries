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
    res_error('Not found', 404);
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

    // Zonen-Verteilung
    $stmt = db()->prepare(
        "SELECT s.zone, COUNT(*) AS cnt
         FROM shots s
         JOIN training_targets tt ON tt.id = s.target_id
         JOIN trainings t ON t.id = tt.training_id
         WHERE $wsql AND s.zone IS NOT NULL AND s.zone != ''
         GROUP BY s.zone ORDER BY cnt DESC"
    );
    $stmt->execute($args);
    $rows = $stmt->fetchAll();
    $total_shots = array_sum(array_map(fn ($r) => (int)$r['cnt'], $rows));
    $zone_dist = array_map(function ($r) use ($total_shots) {
        return [
            'zone'  => $r['zone'],
            'count' => (int)$r['cnt'],
            'pct'   => $total_shots > 0 ? round((int)$r['cnt'] / $total_shots, 4) : 0,
        ];
    }, $rows);

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
        'zone_distribution'      => $zone_dist,
        'arrow_consistency'      => $arrow_consistency,
        'personal_bests'         => $pbs,
        'personal_bests_parcours'=> $pbs_parcours,
    ]);
}

function stats_per_training(int $user_id, int $training_id): void
{
    // Detail-Auswertung für genau ein Training
    $stmt = db()->prepare(
        'SELECT id, discipline, bow_type, started_at, summary_score
         FROM trainings WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$training_id, $user_id]);
    $t = $stmt->fetch();
    if (!$t) res_error('Not found', 404);

    // Stations + Pfeile holen
    $stmt = db()->prepare(
        'SELECT tt.id, tt.target_index, s.arrow_seq, s.zone, s.points
         FROM training_targets tt
         LEFT JOIN shots s ON s.target_id = tt.id
         WHERE tt.training_id = ?
         ORDER BY tt.target_index ASC, s.arrow_seq ASC'
    );
    $stmt->execute([$training_id]);
    $rows = $stmt->fetchAll();

    $stations = []; // station_index => points
    $zones    = []; // zone => count
    $arrows   = []; // arrow_seq => [sum, count]

    foreach ($rows as $r) {
        $idx = (int)$r['target_index'];
        $pts = $r['points'] !== null ? (int)$r['points'] : 0;
        $stations[$idx] = ($stations[$idx] ?? 0) + $pts;
        if ($r['zone']) $zones[$r['zone']] = ($zones[$r['zone']] ?? 0) + 1;
        if ($r['arrow_seq'] !== null) {
            $seq = (int)$r['arrow_seq'];
            $arrows[$seq] ??= ['sum' => 0, 'cnt' => 0];
            $arrows[$seq]['sum'] += $pts;
            $arrows[$seq]['cnt']++;
        }
    }

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

    res_json([
        'training' => [
            'id'         => (int)$t['id'],
            'discipline' => $t['discipline'],
            'bow_type'   => $t['bow_type'],
            'started_at' => $t['started_at'],
        ],
        'total_score'      => (int)$total,
        'station_count'    => count($stations_arr),
        'avg_per_station'  => count($stations_arr) ? round($total / count($stations_arr), 1) : 0,
        'best_station'     => $best,
        'worst_station'    => $worst,
        'stations'         => $stations_arr,
        'zone_distribution'=> $zones_arr,
        'arrow_consistency'=> $arrows_arr,
    ]);
}
