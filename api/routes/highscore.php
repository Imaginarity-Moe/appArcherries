<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

/**
 * Öffentliche Highscores: Top-3 (oder N) Scores pro
 *   (parcours_id, discipline, bow_type)
 * Nur Trainings mit published_to_highscore=1 + summary_score IS NOT NULL ODER
 * computed total > 0 (=mindestens ein gescorter Treffer).
 *
 *  GET /highscore?parcours_id=<id>&discipline=<d>[&bow_type=<b>][&limit=3]
 *
 * Optional: GET /highscore?parcours_id=<id> (alle Disziplinen, alle Bow-Types)
 *   liefert Aggregat-Liste (gruppiert).
 */
function handle_highscore(string $method, string $path): void
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);
    $me = (int)$claims['uid'];

    if ($method !== 'GET') res_error('Method not allowed', 405);

    $parcours_id  = (int)(req_query('parcours_id', '0') ?? '0');
    if ($parcours_id < 1) res_error('parcours_id erforderlich');

    $discipline   = req_query('discipline');
    $bow_type     = req_query('bow_type');
    $limit        = max(1, min(20, (int)(req_query('limit', '3') ?? '3')));
    $friends_only = (req_query('friends_only', '0') ?? '0') === '1';
    $club_id      = (int)(req_query('club_id', '0') ?? '0');
    // ?period=month|year|all  — schränkt auf Trainings im Zeitfenster ein
    $period       = req_query('period', 'all') ?? 'all';
    $period_since = null;
    if ($period === 'month') $period_since = date('Y-m-d H:i:s', strtotime('-30 days'));
    elseif ($period === 'year') $period_since = date('Y-m-d H:i:s', strtotime('-365 days'));

    // Filter-Modi für die User-Allowlist:
    //  - friends_only: nur akzeptierte Freunde + ich
    //  - club_id:      nur Mitglieder dieses Vereins (ich muss selbst Mitglied sein)
    //  - sonst:        null = alle
    $allowed_users = null;
    if ($friends_only) {
        $s = db()->prepare(
            'SELECT CASE WHEN requester_id = ? THEN recipient_id ELSE requester_id END AS friend_id
             FROM friendships
             WHERE status = "accepted" AND (requester_id = ? OR recipient_id = ?)'
        );
        $s->execute([$me, $me, $me]);
        $allowed_users = array_map('intval', $s->fetchAll(PDO::FETCH_COLUMN));
        $allowed_users[] = $me; // eigenes Score immer mit dabei
    } elseif ($club_id > 0) {
        // Prüfen, dass ich selbst in dem Verein bin (sonst 403 — Verein-Highscores
        // sind nicht öffentlich, müssen wir absichern)
        $s = db()->prepare('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?');
        $s->execute([$club_id, $me]);
        if (!$s->fetchColumn()) res_error('Kein Mitglied dieses Vereins', 403);

        $s = db()->prepare('SELECT user_id FROM club_members WHERE club_id = ?');
        $s->execute([$club_id]);
        $allowed_users = array_map('intval', $s->fetchAll(PDO::FETCH_COLUMN));
        if (!$allowed_users) $allowed_users = [$me];
    }

    if ($discipline !== null && $discipline !== '') {
        $rows = highscore_query($parcours_id, $discipline, $bow_type, $limit, $allowed_users, $period_since);
        res_json(['scores' => $rows, 'period' => $period]);
        return;
    }

    // Aggregate: gruppiert nach (discipline, bow_type)
    $sql = 'SELECT discipline, bow_type FROM trainings
            WHERE parcours_id = ? AND published_to_highscore = 1';
    $params = [$parcours_id];
    if ($period_since !== null) {
        $sql .= ' AND started_at >= ?';
        $params[] = $period_since;
    }
    $sql .= ' GROUP BY discipline, bow_type';
    $s = db()->prepare($sql);
    $s->execute($params);
    $groups = $s->fetchAll();
    $out = [];
    foreach ($groups as $g) {
        $rows = highscore_query($parcours_id, $g['discipline'], $g['bow_type'], $limit, $allowed_users, $period_since);
        if (count($rows) > 0) {
            $out[] = [
                'discipline' => $g['discipline'],
                'bow_type'   => $g['bow_type'],
                'scores'     => $rows,
            ];
        }
    }
    res_json(['groups' => $out, 'period' => $period]);
}

function highscore_query(int $parcours_id, string $discipline, ?string $bow_type, int $limit, ?array $allowed_users = null, ?string $period_since = null): array
{
    require_once __DIR__ . '/../lib/Scoring.php';

    // friends_only-Modus: leere Allowlist → keine Ergebnisse
    if ($allowed_users !== null && count($allowed_users) === 0) return [];

    // Schritt 1: alle veröffentlichten Trainings im Filter laden
    // (Soft-deleted Users werden ausgefiltert — ihre Highscores erscheinen nicht mehr.)
    $sql = 'SELECT t.id, t.user_id, t.bow_type, t.summary_score, t.started_at, t.ended_at,
                   u.display_name, u.avatar_path
            FROM trainings t
            JOIN users u ON u.id = t.user_id
            WHERE t.parcours_id = ?
              AND t.discipline = ?
              AND t.published_to_highscore = 1
              AND u.deleted_at IS NULL';
    $params = [$parcours_id, $discipline];
    if ($bow_type !== null && $bow_type !== '') {
        $sql .= ' AND t.bow_type = ?';
        $params[] = $bow_type;
    }
    if ($period_since !== null) {
        $sql .= ' AND t.started_at >= ?';
        $params[] = $period_since;
    }
    if ($allowed_users !== null) {
        $placeholders = implode(',', array_fill(0, count($allowed_users), '?'));
        $sql    .= " AND t.user_id IN ($placeholders)";
        $params  = array_merge($params, $allowed_users);
    }
    $sql .= ' ORDER BY t.started_at DESC';
    $s = db()->prepare($sql);
    $s->execute($params);
    $candidates = $s->fetchAll();
    if (!$candidates) return [];

    // Schritt 2: pro Training Score berechnen (über alle Owner-Targets gerechnet)
    $scored = [];
    foreach ($candidates as $t) {
        $score = (int)($t['summary_score'] ?? 0);
        if ($t['summary_score'] === null) {
            $score = highscore_compute_score((int)$t['id'], (int)$t['user_id'], $discipline);
        }
        if ($score > 0) {
            $scored[] = [
                'training_id' => (int)$t['id'],
                'user_id'     => (int)$t['user_id'],
                'display_name'=> $t['display_name'],
                'avatar_url'  => $t['avatar_path'] ?: null,
                'bow_type'    => $t['bow_type'],
                'score'       => $score,
                'started_at'  => $t['started_at'],
            ];
        }
    }

    // Sortiere nach Score absteigend
    usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
    return array_slice($scored, 0, $limit);
}

function highscore_compute_score(int $training_id, int $owner_user_id, string $discipline): int
{
    // Owner-Participant rausholen
    $s = db()->prepare('SELECT id FROM training_participants WHERE training_id = ? AND user_id = ? AND role = ?');
    $s->execute([$training_id, $owner_user_id, 'owner']);
    $owner_pid = (int)($s->fetchColumn() ?: 0);
    if ($owner_pid === 0) return 0;

    $stmt = db()->prepare(
        'SELECT tt.id AS tid,
                s.arrow_seq, s.zone
         FROM training_targets tt
         LEFT JOIN shots s ON s.target_id = tt.id
         WHERE tt.training_id = ? AND tt.participant_id = ?
         ORDER BY tt.target_index, s.arrow_seq'
    );
    $stmt->execute([$training_id, $owner_pid]);
    $rows = $stmt->fetchAll();
    if (!$rows) return 0;

    // Group by target → shots[]
    $targets = [];
    foreach ($rows as $r) {
        $tid = (int)$r['tid'];
        if (!isset($targets[$tid])) $targets[$tid] = ['shots' => []];
        if ($r['arrow_seq'] !== null) {
            $targets[$tid]['shots'][] = [
                'arrow_seq' => (int)$r['arrow_seq'],
                'zone'      => $r['zone'],
            ];
        }
    }
    return compute_training_total($discipline, array_values($targets), false);
}
