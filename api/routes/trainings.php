<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Scoring.php';

const VALID_DISCIPLINES = ['3d_wa', '3d_ifaa', '3d_bowhunter', 'field_wa', 'simple'];
const VALID_BOW_TYPES   = ['recurve', 'compound', 'barebow', 'traditional'];
const VALID_PEG_COLORS  = ['blue', 'red', 'yellow', 'white'];

function handle_trainings(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/trainings'));

    // Patterns:
    //   ''                                  -> Liste + Create
    //   '/<id>'                             -> Detail / Update / Delete
    //   '/<id>/targets'                     -> Target erstellen
    //   '/<id>/targets/<tid>'               -> Target updaten / löschen

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'  => trainings_list($user['id']),
            'POST' => trainings_create($user['id']),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'    => trainings_detail($user['id'], $id),
            'PATCH'  => trainings_update($user['id'], $id),
            'DELETE' => trainings_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/targets$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'POST'  => targets_create($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/targets/(\d+)$#', $sub, $m)) {
        $id  = (int)$m[1];
        $tid = (int)$m[2];
        match ($method) {
            'PATCH'  => targets_update($user['id'], $id, $tid),
            'DELETE' => targets_delete($user['id'], $id, $tid),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    res_error('Not found', 404);
}

// ─── Trainings ────────────────────────────────────────────────────────────────

function trainings_list(int $user_id): void
{
    $page  = max(1, (int)(req_query('page', '1') ?? '1'));
    $limit = min(100, max(1, (int)(req_query('limit', '20') ?? '20')));
    $off   = ($page - 1) * $limit;

    $stmt = db()->prepare(
        'SELECT id, started_at, ended_at, discipline, bow_type, peg_color,
                distance_marked, location, summary_score
         FROM trainings WHERE user_id = ?
         ORDER BY started_at DESC LIMIT ? OFFSET ?'
    );
    $stmt->bindValue(1, $user_id, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->bindValue(3, $off,   PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['id'] = (int)$it['id'];
        if ($it['summary_score'] !== null) $it['summary_score'] = (int)$it['summary_score'];
        // Total aus shots berechnen wenn keine summary
        if ($it['summary_score'] === null) {
            $it['total_score'] = training_total($user_id, (int)$it['id']);
        } else {
            $it['total_score'] = (int)$it['summary_score'];
        }
    }
    unset($it);

    $count_stmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ?');
    $count_stmt->execute([$user_id]);
    $total = (int)$count_stmt->fetchColumn();

    res_json(['trainings' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit]);
}

function trainings_create(int $user_id): void
{
    $in = req_json();

    $discipline = (string)($in['discipline'] ?? '');
    $bow_type   = (string)($in['bow_type']   ?? '');
    if (!in_array($discipline, VALID_DISCIPLINES, true)) res_error('Ungültige discipline');
    if (!in_array($bow_type,   VALID_BOW_TYPES,   true)) res_error('Ungültiger bow_type');

    $peg_color = $in['peg_color'] ?? null;
    if ($peg_color !== null && !in_array($peg_color, VALID_PEG_COLORS, true)) {
        res_error('Ungültige peg_color');
    }

    $started_at = (string)($in['started_at'] ?? date('Y-m-d H:i:s'));
    // Sanity: erlauben "2026-05-11T18:30" und "2026-05-11 18:30:00"
    $ts = strtotime($started_at);
    if ($ts === false) res_error('Ungültiges started_at');
    $started_at = date('Y-m-d H:i:s', $ts);

    $stmt = db()->prepare(
        'INSERT INTO trainings (user_id, started_at, discipline, bow_type, peg_color, distance_marked, location, weather, notes, summary_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $user_id,
        $started_at,
        $discipline,
        $bow_type,
        $peg_color,
        isset($in['distance_marked']) ? ($in['distance_marked'] ? 1 : 0) : null,
        isset($in['location']) ? (string)$in['location'] : null,
        isset($in['weather'])  ? (string)$in['weather']  : null,
        isset($in['notes'])    ? (string)$in['notes']    : null,
        isset($in['summary_score']) ? (int)$in['summary_score'] : null,
    ]);
    $id = (int)db()->lastInsertId();
    trainings_detail($user_id, $id, 201);
}

function trainings_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare('SELECT * FROM trainings WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $t = $stmt->fetch();
    if (!$t) res_error('Not found', 404);

    $tgt_stmt = db()->prepare(
        'SELECT id, target_index, animal_or_face, distance_m, notes
         FROM training_targets WHERE training_id = ? ORDER BY target_index ASC'
    );
    $tgt_stmt->execute([$id]);
    $targets = $tgt_stmt->fetchAll();

    $shot_stmt = db()->prepare(
        'SELECT id, arrow_seq, zone, points
         FROM shots WHERE target_id = ? ORDER BY arrow_seq ASC'
    );

    $running_total = 0;
    foreach ($targets as &$t2) {
        $t2['id']           = (int)$t2['id'];
        $t2['target_index'] = (int)$t2['target_index'];
        if ($t2['distance_m'] !== null) $t2['distance_m'] = (float)$t2['distance_m'];

        $shot_stmt->execute([$t2['id']]);
        $shots = $shot_stmt->fetchAll();
        $sum = 0;
        foreach ($shots as &$s) {
            $s['id']        = (int)$s['id'];
            $s['arrow_seq'] = (int)$s['arrow_seq'];
            $s['points']    = (int)$s['points'];
            $sum           += $s['points'];
        }
        unset($s);
        $t2['shots']       = $shots;
        $t2['target_total'] = $sum;
        $running_total    += $sum;
    }
    unset($t2);

    $t['id'] = (int)$t['id'];
    if ($t['summary_score'] !== null) $t['summary_score'] = (int)$t['summary_score'];
    if ($t['distance_marked'] !== null) $t['distance_marked'] = (bool)$t['distance_marked'];
    $t['targets']     = $targets;
    $t['total_score'] = $t['summary_score'] ?? $running_total;

    res_json(['training' => $t], $status);
}

function trainings_update(int $user_id, int $id): void
{
    if (!training_owned($user_id, $id)) res_error('Not found', 404);
    $in = req_json();

    $sets = [];
    $vals = [];
    foreach ([
        'ended_at'        => 'datetime',
        'location'        => 'string',
        'weather'         => 'string',
        'notes'           => 'string',
        'summary_score'   => 'int',
        'distance_marked' => 'bool',
        'peg_color'       => 'peg',
    ] as $key => $type) {
        if (!array_key_exists($key, $in)) continue;
        $v = $in[$key];
        switch ($type) {
            case 'datetime':
                if ($v === null) { $sets[] = "$key = NULL"; continue 2; }
                $ts = strtotime((string)$v);
                if ($ts === false) res_error("Ungültiges $key");
                $sets[] = "$key = ?"; $vals[] = date('Y-m-d H:i:s', $ts);
                break;
            case 'bool':
                $sets[] = "$key = ?"; $vals[] = $v === null ? null : ($v ? 1 : 0);
                break;
            case 'int':
                $sets[] = "$key = ?"; $vals[] = $v === null ? null : (int)$v;
                break;
            case 'peg':
                if ($v !== null && !in_array($v, VALID_PEG_COLORS, true)) res_error('Ungültige peg_color');
                $sets[] = "$key = ?"; $vals[] = $v;
                break;
            default:
                $sets[] = "$key = ?"; $vals[] = $v === null ? null : (string)$v;
        }
    }
    if (!$sets) {
        trainings_detail($user_id, $id);
        return;
    }
    $vals[] = $id;
    $vals[] = $user_id;
    db()->prepare("UPDATE trainings SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")
        ->execute($vals);
    trainings_detail($user_id, $id);
}

function trainings_delete(int $user_id, int $id): void
{
    if (!training_owned($user_id, $id)) res_error('Not found', 404);
    db()->prepare('DELETE FROM trainings WHERE id = ? AND user_id = ?')->execute([$id, $user_id]);
    res_json(['ok' => true]);
}

// ─── Targets ──────────────────────────────────────────────────────────────────

function targets_create(int $user_id, int $training_id): void
{
    if (!training_owned($user_id, $training_id)) res_error('Not found', 404);
    $in   = req_json();
    $disc = training_discipline($training_id);

    $target_index = (int)($in['target_index'] ?? 0);
    if ($target_index < 1) res_error('target_index erforderlich (>=1)');

    db()->beginTransaction();
    try {
        // ON DUPLICATE bei target_index: existierendes target nehmen, sonst neu
        $stmt = db()->prepare(
            'INSERT INTO training_targets (training_id, target_index, animal_or_face, distance_m, notes)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               animal_or_face = VALUES(animal_or_face),
               distance_m     = VALUES(distance_m),
               notes          = VALUES(notes)'
        );
        $stmt->execute([
            $training_id,
            $target_index,
            isset($in['animal_or_face']) ? (string)$in['animal_or_face'] : null,
            isset($in['distance_m'])     ? (float)$in['distance_m']      : null,
            isset($in['notes'])          ? (string)$in['notes']          : null,
        ]);
        $tid = (int)db()->lastInsertId();
        if ($tid === 0) {
            // war ein UPDATE — ID nachholen
            $f = db()->prepare('SELECT id FROM training_targets WHERE training_id = ? AND target_index = ?');
            $f->execute([$training_id, $target_index]);
            $tid = (int)$f->fetchColumn();
        }

        if (isset($in['shots']) && is_array($in['shots'])) {
            replace_shots($tid, $disc, $in['shots']);
        }

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    target_detail($training_id, $tid);
}

function targets_update(int $user_id, int $training_id, int $tid): void
{
    if (!training_owned($user_id, $training_id)) res_error('Not found', 404);

    $stmt = db()->prepare('SELECT id FROM training_targets WHERE id = ? AND training_id = ?');
    $stmt->execute([$tid, $training_id]);
    if (!$stmt->fetch()) res_error('Not found', 404);

    $in   = req_json();
    $disc = training_discipline($training_id);

    $sets = [];
    $vals = [];
    if (array_key_exists('animal_or_face', $in)) { $sets[] = 'animal_or_face = ?'; $vals[] = $in['animal_or_face'] === null ? null : (string)$in['animal_or_face']; }
    if (array_key_exists('distance_m', $in))     { $sets[] = 'distance_m = ?';     $vals[] = $in['distance_m']     === null ? null : (float)$in['distance_m']; }
    if (array_key_exists('notes', $in))          { $sets[] = 'notes = ?';          $vals[] = $in['notes']          === null ? null : (string)$in['notes']; }

    db()->beginTransaction();
    try {
        if ($sets) {
            $vals[] = $tid;
            db()->prepare("UPDATE training_targets SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
        }
        if (isset($in['shots']) && is_array($in['shots'])) {
            replace_shots($tid, $disc, $in['shots']);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    target_detail($training_id, $tid);
}

function targets_delete(int $user_id, int $training_id, int $tid): void
{
    if (!training_owned($user_id, $training_id)) res_error('Not found', 404);
    db()->prepare('DELETE FROM training_targets WHERE id = ? AND training_id = ?')->execute([$tid, $training_id]);
    res_json(['ok' => true]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function training_owned(int $user_id, int $training_id): bool
{
    $s = db()->prepare('SELECT 1 FROM trainings WHERE id = ? AND user_id = ?');
    $s->execute([$training_id, $user_id]);
    return (bool)$s->fetchColumn();
}

function training_discipline(int $training_id): string
{
    $s = db()->prepare('SELECT discipline FROM trainings WHERE id = ?');
    $s->execute([$training_id]);
    return (string)$s->fetchColumn();
}

function training_total(int $user_id, int $training_id): int
{
    $s = db()->prepare(
        'SELECT COALESCE(SUM(s.points), 0)
         FROM shots s
         JOIN training_targets t ON t.id = s.target_id
         JOIN trainings tr        ON tr.id = t.training_id
         WHERE tr.id = ? AND tr.user_id = ?'
    );
    $s->execute([$training_id, $user_id]);
    return (int)$s->fetchColumn();
}

function replace_shots(int $target_id, string $discipline, array $shots): void
{
    // Eingehende Shots normalisieren
    $clean = [];
    foreach ($shots as $s) {
        if (!is_array($s)) continue;
        $seq = (int)($s['arrow_seq'] ?? 0);
        if ($seq < 1) continue;
        $clean[] = ['arrow_seq' => $seq, 'zone' => isset($s['zone']) ? (string)$s['zone'] : null];
    }
    // Punkte berechnen
    $scored = score_target($discipline, $clean);

    // Alte Shots löschen, neue einfügen
    db()->prepare('DELETE FROM shots WHERE target_id = ?')->execute([$target_id]);
    if (!$scored) return;
    $stmt = db()->prepare('INSERT INTO shots (target_id, arrow_seq, zone, points) VALUES (?, ?, ?, ?)');
    foreach ($scored as $s) {
        $stmt->execute([$target_id, $s['arrow_seq'], $s['zone'], $s['points']]);
    }
}

function target_detail(int $training_id, int $tid): void
{
    $stmt = db()->prepare(
        'SELECT id, target_index, animal_or_face, distance_m, notes
         FROM training_targets WHERE id = ? AND training_id = ?'
    );
    $stmt->execute([$tid, $training_id]);
    $t = $stmt->fetch();
    if (!$t) res_error('Not found', 404);

    $shot_stmt = db()->prepare(
        'SELECT id, arrow_seq, zone, points FROM shots WHERE target_id = ? ORDER BY arrow_seq ASC'
    );
    $shot_stmt->execute([$tid]);
    $shots = $shot_stmt->fetchAll();
    $sum = 0;
    foreach ($shots as &$s) {
        $s['id']        = (int)$s['id'];
        $s['arrow_seq'] = (int)$s['arrow_seq'];
        $s['points']    = (int)$s['points'];
        $sum           += $s['points'];
    }
    unset($s);

    $t['id']           = (int)$t['id'];
    $t['target_index'] = (int)$t['target_index'];
    if ($t['distance_m'] !== null) $t['distance_m'] = (float)$t['distance_m'];
    $t['shots']        = $shots;
    $t['target_total'] = $sum;

    res_json(['target' => $t]);
}
