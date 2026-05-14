<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Scoring.php';
require_once __DIR__ . '/../lib/Uploads.php';
require_once __DIR__ . '/invitations.php';

const STATIONS_UPLOAD_DIR = '/uploads/stations';

const VALID_DISCIPLINES = [
    '3d_wa', '3d_ifaa', '3d_ifaa_hunter', '3d_ifaa_animal', '3d_bowhunter',
    'field_wa', 'field_ifaa', 'simple',
];
const VALID_BOW_TYPES   = ['recurve', 'compound', 'barebow', 'traditional'];
const VALID_PEG_COLORS  = ['blue', 'red', 'yellow', 'white'];

function handle_trainings(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/trainings'));

    // Patterns:
    //   ''                                       -> Liste + Create
    //   '/<id>'                                  -> Detail / Update / Delete
    //   '/<id>/invitations'                      -> Invite-Liste + Create
    //   '/<id>/invitations/<invid>'              -> Invite löschen
    //   '/<id>/targets'                          -> Target erstellen
    //   '/<id>/targets/<tid>'                    -> Target updaten / löschen

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

    if (preg_match('#^/(\d+)/invitations$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'  => invitations_list($user['id'], $id),
            'POST' => invitations_create($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/invitations/(\d+)$#', $sub, $m)) {
        $id    = (int)$m[1];
        $invid = (int)$m[2];
        match ($method) {
            'DELETE' => invitations_delete($user['id'], $id, $invid),
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

    if (preg_match('#^/(\d+)/targets/(\d+)/image$#', $sub, $m)) {
        $id  = (int)$m[1];
        $tid = (int)$m[2];
        match ($method) {
            'POST'   => target_image_upload($user['id'], $id, $tid),
            'DELETE' => target_image_delete($user['id'], $id, $tid),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    res_error('Not found', 404);
}

function target_image_upload(int $user_id, int $training_id, int $tid): void
{
    $pid = user_participant_id($user_id, $training_id);
    if ($pid === null) res_error('Not found', 404);

    $stmt = db()->prepare(
        'SELECT image_path FROM training_targets WHERE id = ? AND training_id = ? AND participant_id = ?'
    );
    $stmt->execute([$tid, $training_id, $pid]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    $rel = process_image_upload(STATIONS_UPLOAD_DIR, sprintf('s%d', $tid));

    // Altes Bild löschen
    delete_upload_file($row['image_path'] ?? null);

    db()->prepare('UPDATE training_targets SET image_path = ? WHERE id = ?')
        ->execute([$rel, $tid]);

    res_json(['ok' => true, 'image_path' => $rel, 'image_url' => $rel]);
}

function target_image_delete(int $user_id, int $training_id, int $tid): void
{
    $pid = user_participant_id($user_id, $training_id);
    if ($pid === null) res_error('Not found', 404);

    $stmt = db()->prepare(
        'SELECT image_path FROM training_targets WHERE id = ? AND training_id = ? AND participant_id = ?'
    );
    $stmt->execute([$tid, $training_id, $pid]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    delete_upload_file($row['image_path'] ?? null);
    db()->prepare('UPDATE training_targets SET image_path = NULL WHERE id = ?')->execute([$tid]);

    res_json(['ok' => true]);
}

// ─── Trainings ────────────────────────────────────────────────────────────────

function trainings_list(int $user_id): void
{
    $page  = max(1, (int)(req_query('page', '1') ?? '1'));
    $limit = min(100, max(1, (int)(req_query('limit', '20') ?? '20')));
    $off   = ($page - 1) * $limit;

    // Trainings, in denen User Owner ODER Participant ist
    $stmt = db()->prepare(
        'SELECT DISTINCT t.id, t.started_at, t.ended_at, t.discipline, t.nfaa_mode, t.bow_type, t.peg_color,
                t.distance_marked, t.location, t.summary_score, t.parcours_id, p.name AS parcours_name,
                t.user_id AS owner_user_id
         FROM trainings t
         LEFT JOIN parcours p ON p.id = t.parcours_id
         LEFT JOIN training_participants tp ON tp.training_id = t.id AND tp.user_id = ?
         WHERE t.user_id = ? OR tp.user_id IS NOT NULL
         ORDER BY t.started_at DESC LIMIT ? OFFSET ?'
    );
    $stmt->bindValue(1, $user_id, PDO::PARAM_INT);
    $stmt->bindValue(2, $user_id, PDO::PARAM_INT);
    $stmt->bindValue(3, $limit, PDO::PARAM_INT);
    $stmt->bindValue(4, $off,   PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['id']            = (int)$it['id'];
        $it['owner_user_id'] = (int)$it['owner_user_id'];
        $it['is_shared']     = $it['owner_user_id'] !== $user_id;
        $it['nfaa_mode']     = (bool)(int)($it['nfaa_mode'] ?? 0);
        if ($it['summary_score'] !== null) $it['summary_score'] = (int)$it['summary_score'];
        if ($it['summary_score'] === null) {
            $it['total_score'] = participant_total($user_id, (int)$it['id']);
        } else {
            $it['total_score'] = (int)$it['summary_score'];
        }
    }
    unset($it);

    $count_stmt = db()->prepare(
        'SELECT COUNT(DISTINCT t.id) FROM trainings t
         LEFT JOIN training_participants tp ON tp.training_id = t.id AND tp.user_id = ?
         WHERE t.user_id = ? OR tp.user_id IS NOT NULL'
    );
    $count_stmt->execute([$user_id, $user_id]);
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
    $ts = strtotime($started_at);
    if ($ts === false) res_error('Ungültiges started_at');
    $started_at = date('Y-m-d H:i:s', $ts);

    $parcours_id = null;
    if (isset($in['parcours_id']) && $in['parcours_id'] !== null) {
        $pid = (int)$in['parcours_id'];
        $s = db()->prepare('SELECT id FROM parcours WHERE id = ? AND (user_id = ? OR is_public = 1)');
        $s->execute([$pid, $user_id]);
        if ($s->fetch()) $parcours_id = $pid;
    }

    db()->beginTransaction();
    try {
        $stmt = db()->prepare(
            'INSERT INTO trainings (user_id, parcours_id, started_at, discipline, nfaa_mode, bow_type, peg_color, distance_marked, location, weather, notes, summary_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user_id,
            $parcours_id,
            $started_at,
            $discipline,
            !empty($in['nfaa_mode']) ? 1 : 0,
            $bow_type,
            $peg_color,
            isset($in['distance_marked']) ? ($in['distance_marked'] ? 1 : 0) : null,
            isset($in['location']) ? (string)$in['location'] : null,
            isset($in['weather'])  ? (string)$in['weather']  : null,
            isset($in['notes'])    ? (string)$in['notes']    : null,
            isset($in['summary_score']) ? (int)$in['summary_score'] : null,
        ]);
        $id = (int)db()->lastInsertId();

        // Owner-Participant anlegen
        db()->prepare(
            'INSERT INTO training_participants (training_id, user_id, role) VALUES (?, ?, ?)'
        )->execute([$id, $user_id, 'owner']);

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    trainings_detail($user_id, $id, 201);
}

function trainings_detail(int $user_id, int $id, int $status = 200): void
{
    if (!user_can_access_training($user_id, $id)) res_error('Not found', 404);

    $stmt = db()->prepare(
        'SELECT t.*, p.name AS parcours_name
         FROM trainings t LEFT JOIN parcours p ON p.id = t.parcours_id
         WHERE t.id = ?'
    );
    $stmt->execute([$id]);
    $t = $stmt->fetch();
    if (!$t) res_error('Not found', 404);

    // Alle Participants laden
    $p_stmt = db()->prepare(
        'SELECT tp.id, tp.user_id, tp.role, tp.joined_at, u.display_name, u.role AS user_role
         FROM training_participants tp
         JOIN users u ON u.id = tp.user_id
         WHERE tp.training_id = ?
         ORDER BY tp.role = "owner" DESC, tp.joined_at ASC'
    );
    $p_stmt->execute([$id]);
    $participants = $p_stmt->fetchAll();

    // Alle Targets aller Participants
    $tgt_stmt = db()->prepare(
        'SELECT id, participant_id, target_index, animal_or_face, distance_m, notes, image_path
         FROM training_targets WHERE training_id = ? ORDER BY participant_id, target_index ASC'
    );
    $tgt_stmt->execute([$id]);
    $targets = $tgt_stmt->fetchAll();

    $shot_stmt = db()->prepare(
        'SELECT id, arrow_seq, zone, points, x_norm, y_norm FROM shots WHERE target_id = ? ORDER BY arrow_seq ASC'
    );

    // Pro Participant: Total & seine Targets
    $participant_totals = [];
    foreach ($targets as &$t2) {
        $t2['id']             = (int)$t2['id'];
        $t2['participant_id'] = (int)$t2['participant_id'];
        $t2['target_index']   = (int)$t2['target_index'];
        if ($t2['distance_m'] !== null) $t2['distance_m'] = (float)$t2['distance_m'];

        $shot_stmt->execute([$t2['id']]);
        $shots = $shot_stmt->fetchAll();
        $sum = 0;
        foreach ($shots as &$s) {
            $s['id']        = (int)$s['id'];
            $s['arrow_seq'] = (int)$s['arrow_seq'];
            $s['points']    = (int)$s['points'];
            if ($s['x_norm'] !== null) $s['x_norm'] = (float)$s['x_norm'];
            if ($s['y_norm'] !== null) $s['y_norm'] = (float)$s['y_norm'];
            $sum           += $s['points'];
        }
        unset($s);
        $t2['shots']        = $shots;
        $t2['target_total'] = $sum;
        $participant_totals[$t2['participant_id']] = ($participant_totals[$t2['participant_id']] ?? 0) + $sum;
    }
    unset($t2);

    foreach ($participants as &$p) {
        $p['id']      = (int)$p['id'];
        $p['user_id'] = (int)$p['user_id'];
        $p['total_score'] = (int)($participant_totals[$p['id']] ?? 0);
        $p['is_self']     = $p['user_id'] === $user_id;
    }
    unset($p);

    // Aktueller User: eigene participant_id ermitteln
    $own_pid = null;
    foreach ($participants as $p) {
        if ($p['user_id'] === $user_id) { $own_pid = (int)$p['id']; break; }
    }

    $t['id']             = (int)$t['id'];
    $t['user_id']        = (int)$t['user_id'];
    $t['is_owner']       = $t['user_id'] === $user_id;
    $t['my_participant_id'] = $own_pid;
    $t['nfaa_mode']              = (bool)(int)($t['nfaa_mode'] ?? 0);
    $t['published_to_highscore'] = (bool)(int)($t['published_to_highscore'] ?? 0);
    if ($t['summary_score']   !== null) $t['summary_score']   = (int)$t['summary_score'];
    if ($t['distance_marked'] !== null) $t['distance_marked'] = (bool)$t['distance_marked'];
    $t['targets']      = $targets;
    $t['participants'] = $participants;
    // total_score = own participant's total (UI kann das pro-Participant anzeigen)
    $t['total_score']  = (int)($participant_totals[$own_pid] ?? 0);

    res_json(['training' => $t], $status);
}

function trainings_update(int $user_id, int $id): void
{
    if (!training_owned($user_id, $id)) res_error('Not found', 404);
    $in = req_json();

    $sets = [];
    $vals = [];
    foreach ([
        'ended_at'                => 'datetime',
        'location'                => 'string',
        'weather'                 => 'string',
        'notes'                   => 'string',
        'summary_score'           => 'int',
        'distance_marked'         => 'bool',
        'peg_color'               => 'peg',
        'published_to_highscore'  => 'bool',
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
    $pid = user_participant_id($user_id, $training_id);
    if ($pid === null) res_error('Not found', 404);

    $in   = req_json();
    $disc = training_discipline($training_id);

    $target_index = (int)($in['target_index'] ?? 0);
    if ($target_index < 1) res_error('target_index erforderlich (>=1)');

    db()->beginTransaction();
    try {
        $stmt = db()->prepare(
            'INSERT INTO training_targets (training_id, participant_id, target_index, animal_or_face, distance_m, notes)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               animal_or_face = VALUES(animal_or_face),
               distance_m     = VALUES(distance_m),
               notes          = VALUES(notes)'
        );
        $stmt->execute([
            $training_id,
            $pid,
            $target_index,
            isset($in['animal_or_face']) ? (string)$in['animal_or_face'] : null,
            isset($in['distance_m'])     ? (float)$in['distance_m']      : null,
            isset($in['notes'])          ? (string)$in['notes']          : null,
        ]);
        $tid = (int)db()->lastInsertId();
        if ($tid === 0) {
            $f = db()->prepare(
                'SELECT id FROM training_targets WHERE training_id = ? AND participant_id = ? AND target_index = ?'
            );
            $f->execute([$training_id, $pid, $target_index]);
            $tid = (int)$f->fetchColumn();
        }

        if (isset($in['shots']) && is_array($in['shots'])) {
            replace_shots($tid, $disc, $in['shots'], training_nfaa($training_id));
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
    $pid = user_participant_id($user_id, $training_id);
    if ($pid === null) res_error('Not found', 404);

    $stmt = db()->prepare('SELECT id FROM training_targets WHERE id = ? AND training_id = ? AND participant_id = ?');
    $stmt->execute([$tid, $training_id, $pid]);
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
            replace_shots($tid, $disc, $in['shots'], training_nfaa($training_id));
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
    $pid = user_participant_id($user_id, $training_id);
    if ($pid === null) res_error('Not found', 404);
    db()->prepare('DELETE FROM training_targets WHERE id = ? AND training_id = ? AND participant_id = ?')
        ->execute([$tid, $training_id, $pid]);
    res_json(['ok' => true]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function training_owned(int $user_id, int $training_id): bool
{
    $s = db()->prepare('SELECT 1 FROM trainings WHERE id = ? AND user_id = ?');
    $s->execute([$training_id, $user_id]);
    return (bool)$s->fetchColumn();
}

function user_can_access_training(int $user_id, int $training_id): bool
{
    $s = db()->prepare(
        'SELECT 1 FROM trainings t
         LEFT JOIN training_participants tp ON tp.training_id = t.id AND tp.user_id = ?
         WHERE t.id = ? AND (t.user_id = ? OR tp.user_id IS NOT NULL)
         LIMIT 1'
    );
    $s->execute([$user_id, $training_id, $user_id]);
    return (bool)$s->fetchColumn();
}

function user_participant_id(int $user_id, int $training_id): ?int
{
    $s = db()->prepare('SELECT id FROM training_participants WHERE training_id = ? AND user_id = ?');
    $s->execute([$training_id, $user_id]);
    $v = $s->fetchColumn();
    return $v === false ? null : (int)$v;
}

function training_discipline(int $training_id): string
{
    $s = db()->prepare('SELECT discipline FROM trainings WHERE id = ?');
    $s->execute([$training_id]);
    return (string)$s->fetchColumn();
}

function training_nfaa(int $training_id): bool
{
    $s = db()->prepare('SELECT nfaa_mode FROM trainings WHERE id = ?');
    $s->execute([$training_id]);
    return (bool)(int)$s->fetchColumn();
}

function participant_total(int $user_id, int $training_id): int
{
    $s = db()->prepare(
        'SELECT COALESCE(SUM(s.points), 0)
         FROM shots s
         JOIN training_targets t  ON t.id = s.target_id
         JOIN training_participants tp ON tp.id = t.participant_id
         WHERE t.training_id = ? AND tp.user_id = ?'
    );
    $s->execute([$training_id, $user_id]);
    return (int)$s->fetchColumn();
}

function replace_shots(int $target_id, string $discipline, array $shots, bool $nfaa = false): void
{
    $clean = [];
    foreach ($shots as $s) {
        if (!is_array($s)) continue;
        $seq = (int)($s['arrow_seq'] ?? 0);
        if ($seq < 1) continue;
        $clean[] = [
            'arrow_seq' => $seq,
            'zone'      => isset($s['zone']) ? (string)$s['zone'] : null,
            'x_norm'    => isset($s['x_norm']) && $s['x_norm'] !== null ? (float)$s['x_norm'] : null,
            'y_norm'    => isset($s['y_norm']) && $s['y_norm'] !== null ? (float)$s['y_norm'] : null,
        ];
    }
    $scored = score_target($discipline, $clean, $nfaa);

    db()->prepare('DELETE FROM shots WHERE target_id = ?')->execute([$target_id]);
    if (!$scored) return;
    $stmt = db()->prepare(
        'INSERT INTO shots (target_id, arrow_seq, zone, points, x_norm, y_norm) VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($scored as $s) {
        $stmt->execute([
            $target_id,
            $s['arrow_seq'],
            $s['zone'],
            $s['points'],
            $s['x_norm'] ?? null,
            $s['y_norm'] ?? null,
        ]);
    }
}

function target_detail(int $training_id, int $tid): void
{
    $stmt = db()->prepare(
        'SELECT id, participant_id, target_index, animal_or_face, distance_m, notes, image_path
         FROM training_targets WHERE id = ? AND training_id = ?'
    );
    $stmt->execute([$tid, $training_id]);
    $t = $stmt->fetch();
    if (!$t) res_error('Not found', 404);

    $shot_stmt = db()->prepare(
        'SELECT id, arrow_seq, zone, points, x_norm, y_norm FROM shots WHERE target_id = ? ORDER BY arrow_seq ASC'
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

    $t['id']             = (int)$t['id'];
    $t['participant_id'] = (int)$t['participant_id'];
    $t['target_index']   = (int)$t['target_index'];
    if ($t['distance_m'] !== null) $t['distance_m'] = (float)$t['distance_m'];
    $t['shots']        = $shots;
    $t['target_total'] = $sum;

    res_json(['target' => $t]);
}
