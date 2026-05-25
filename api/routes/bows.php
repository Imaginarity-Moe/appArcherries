<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Uploads.php';

const VALID_BOW_TYPES_BOW = ['recurve', 'compound', 'barebow', 'traditional'];
const BOWS_UPLOAD_DIR     = '/uploads/bows';

function handle_bows(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/bows'));

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'  => bows_list($user['id']),
            'POST' => bows_create($user['id']),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'    => bow_detail($user['id'], $id),
            'PATCH'  => bows_update($user['id'], $id),
            'DELETE' => bows_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/image$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'POST'   => bows_image_upload($user['id'], $id),
            'DELETE' => bows_image_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/sight-marks$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'  => sight_marks_list($user['id'], $id),
            'POST' => sight_marks_create($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/sight-marks/(\d+)$#', $sub, $m)) {
        $bow_id = (int)$m[1]; $sm_id = (int)$m[2];
        match ($method) {
            'PATCH'  => sight_marks_update($user['id'], $bow_id, $sm_id),
            'DELETE' => sight_marks_delete($user['id'], $bow_id, $sm_id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/equipment$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'POST' => bow_equipment_add($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/equipment/(\d+)$#', $sub, $m)) {
        $bow_id = (int)$m[1]; $eq_id = (int)$m[2];
        match ($method) {
            'PATCH'  => bow_equipment_update($user['id'], $bow_id, $eq_id),
            'DELETE' => bow_equipment_remove($user['id'], $bow_id, $eq_id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    res_error('Not found', 404);
}

function bow_assert_own(int $user_id, int $bow_id): void
{
    $s = db()->prepare('SELECT id FROM bows WHERE id = ? AND user_id = ?');
    $s->execute([$bow_id, $user_id]);
    if (!$s->fetch()) res_error('Not found', 404);
}

function bow_equipment_add(int $user_id, int $bow_id): void
{
    bow_assert_own($user_id, $bow_id);
    $in = req_json();
    $eq_id = (int)($in['equipment_item_id'] ?? 0);
    if ($eq_id <= 0) res_error('equipment_item_id erforderlich');
    // Item muss dem User gehören
    $own = db()->prepare('SELECT id FROM equipment_items WHERE id = ? AND user_id = ?');
    $own->execute([$eq_id, $user_id]);
    if (!$own->fetch()) res_error('Equipment-Item gehört dir nicht', 403);
    $role = isset($in['role']) && $in['role'] !== '' ? mb_substr((string)$in['role'], 0, 60) : null;

    db()->prepare(
        'INSERT IGNORE INTO bow_equipment (bow_id, equipment_item_id, role) VALUES (?, ?, ?)'
    )->execute([$bow_id, $eq_id, $role]);

    bow_detail($user_id, $bow_id);
}

function bow_equipment_update(int $user_id, int $bow_id, int $eq_id): void
{
    bow_assert_own($user_id, $bow_id);
    $in = req_json();
    if (array_key_exists('role', $in)) {
        $role = $in['role'] !== null && $in['role'] !== '' ? mb_substr((string)$in['role'], 0, 60) : null;
        db()->prepare(
            'UPDATE bow_equipment SET role = ? WHERE bow_id = ? AND equipment_item_id = ?'
        )->execute([$role, $bow_id, $eq_id]);
    }
    bow_detail($user_id, $bow_id);
}

function bow_equipment_remove(int $user_id, int $bow_id, int $eq_id): void
{
    bow_assert_own($user_id, $bow_id);
    db()->prepare(
        'DELETE FROM bow_equipment WHERE bow_id = ? AND equipment_item_id = ?'
    )->execute([$bow_id, $eq_id]);
    bow_detail($user_id, $bow_id);
}

function bows_list(int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT id, name, bow_type, draw_weight_lbs, length_inch, brace_height_inch, let_off_percent, arrow_spine, sight_marks, notes, image_path, is_default, created_at, updated_at
         FROM bows WHERE user_id = ? ORDER BY is_default DESC, name ASC'
    );
    $stmt->execute([$user_id]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r = bow_row_normalize($r);
    }
    unset($r);
    res_json(['bows' => $rows]);
}

function bow_row_normalize(array $r): array
{
    $r['id']         = (int)$r['id'];
    $r['is_default'] = (bool)$r['is_default'];
    if ($r['draw_weight_lbs']   !== null) $r['draw_weight_lbs']   = (float)$r['draw_weight_lbs'];
    if ($r['length_inch']       !== null) $r['length_inch']       = (float)$r['length_inch'];
    if ($r['brace_height_inch'] !== null) $r['brace_height_inch'] = (float)$r['brace_height_inch'];
    if ($r['let_off_percent']   !== null) $r['let_off_percent']   = (int)$r['let_off_percent'];
    $r['image_url']  = $r['image_path'] ?: null;
    return $r;
}

function bows_create(int $user_id): void
{
    $in = req_json();
    $name = trim((string)($in['name'] ?? ''));
    $bow_type = (string)($in['bow_type'] ?? '');
    if ($name === '') res_error('name erforderlich');
    if (mb_strlen($name) > 120) res_error('name zu lang');
    if (!in_array($bow_type, VALID_BOW_TYPES_BOW, true)) res_error('Ungültiger bow_type');

    db()->beginTransaction();
    try {
        $is_default = !empty($in['is_default']) ? 1 : 0;
        if ($is_default) {
            db()->prepare('UPDATE bows SET is_default = 0 WHERE user_id = ?')->execute([$user_id]);
        } else {
            // Wenn es der erste Bogen ist, automatisch default
            $c = db()->prepare('SELECT COUNT(*) FROM bows WHERE user_id = ?');
            $c->execute([$user_id]);
            if ((int)$c->fetchColumn() === 0) $is_default = 1;
        }

        db()->prepare(
            'INSERT INTO bows (user_id, name, bow_type, draw_weight_lbs, length_inch, brace_height_inch, let_off_percent, arrow_spine, sight_marks, notes, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $user_id,
            $name,
            $bow_type,
            bow_num($in, 'draw_weight_lbs'),
            bow_num($in, 'length_inch'),
            bow_num($in, 'brace_height_inch'),
            bow_num_int($in, 'let_off_percent'),
            isset($in['arrow_spine']) ? (string)$in['arrow_spine'] : null,
            isset($in['sight_marks']) ? (string)$in['sight_marks'] : null,
            isset($in['notes']) ? (string)$in['notes'] : null,
            $is_default,
        ]);
        $id = (int)db()->lastInsertId();

        if (array_key_exists('arrow_ids', $in)) {
            bow_set_arrow_links($user_id, $id, bow_extract_arrow_ids($in));
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    bow_detail($user_id, $id, 201);
}

function bow_num(array $in, string $k): ?float
{
    if (!array_key_exists($k, $in)) return null;
    $v = $in[$k];
    return ($v === null || $v === '') ? null : (float)$v;
}
function bow_num_int(array $in, string $k): ?int
{
    if (!array_key_exists($k, $in)) return null;
    $v = $in[$k];
    return ($v === null || $v === '') ? null : (int)$v;
}

function bows_update(int $user_id, int $id): void
{
    $own = db()->prepare('SELECT id FROM bows WHERE id = ? AND user_id = ?');
    $own->execute([$id, $user_id]);
    if (!$own->fetch()) res_error('Not found', 404);

    $in = req_json();
    $sets = [];
    $vals = [];

    if (array_key_exists('name', $in)) {
        $name = trim((string)$in['name']);
        if ($name === '' || mb_strlen($name) > 120) res_error('Ungültiger name');
        $sets[] = 'name = ?'; $vals[] = $name;
    }
    if (array_key_exists('bow_type', $in)) {
        if (!in_array($in['bow_type'], VALID_BOW_TYPES_BOW, true)) res_error('Ungültiger bow_type');
        $sets[] = 'bow_type = ?'; $vals[] = $in['bow_type'];
    }
    foreach (['draw_weight_lbs','length_inch','brace_height_inch','arrow_spine','sight_marks','notes'] as $f) {
        if (!array_key_exists($f, $in)) continue;
        $v = $in[$f];
        if (in_array($f, ['draw_weight_lbs','length_inch','brace_height_inch'], true)) {
            $sets[] = "$f = ?"; $vals[] = ($v === null || $v === '') ? null : (float)$v;
        } else {
            $sets[] = "$f = ?"; $vals[] = ($v === null || $v === '') ? null : (string)$v;
        }
    }
    if (array_key_exists('let_off_percent', $in)) {
        $v = $in['let_off_percent'];
        $sets[] = 'let_off_percent = ?';
        $vals[] = ($v === null || $v === '') ? null : (int)$v;
    }

    db()->beginTransaction();
    try {
        if (array_key_exists('is_default', $in) && $in['is_default']) {
            db()->prepare('UPDATE bows SET is_default = 0 WHERE user_id = ?')->execute([$user_id]);
            $sets[] = 'is_default = 1';
        }

        if ($sets) {
            $vals[] = $id;
            db()->prepare("UPDATE bows SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
        }

        if (array_key_exists('arrow_ids', $in)) {
            bow_set_arrow_links($user_id, $id, bow_extract_arrow_ids($in));
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    bow_detail($user_id, $id);
}

function bow_extract_arrow_ids(array $in): array
{
    if (!is_array($in['arrow_ids'] ?? null)) return [];
    $ids = [];
    foreach ($in['arrow_ids'] as $v) {
        $id = (int)$v;
        if ($id > 0) $ids[] = $id;
    }
    return array_values(array_unique($ids));
}

function bow_set_arrow_links(int $user_id, int $bow_id, array $arrow_ids): void
{
    db()->prepare('DELETE FROM bow_arrows WHERE bow_id = ?')->execute([$bow_id]);
    if (empty($arrow_ids)) return;

    $marks = implode(',', array_fill(0, count($arrow_ids), '?'));
    $stmt  = db()->prepare("SELECT id FROM arrows WHERE id IN ($marks) AND user_id = ?");
    $stmt->execute([...$arrow_ids, $user_id]);
    $allowed = array_map('intval', array_column($stmt->fetchAll(), 'id'));

    if (!$allowed) return;
    $ins = db()->prepare('INSERT IGNORE INTO bow_arrows (bow_id, arrow_id) VALUES (?, ?)');
    foreach ($allowed as $aid) $ins->execute([$bow_id, $aid]);
}

function bows_delete(int $user_id, int $id): void
{
    db()->prepare('DELETE FROM bows WHERE id = ? AND user_id = ?')->execute([$id, $user_id]);
    res_json(['ok' => true]);
}

function bow_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare(
        'SELECT id, name, bow_type, draw_weight_lbs, length_inch, brace_height_inch, let_off_percent, arrow_spine, sight_marks, notes, image_path, is_default, created_at, updated_at
         FROM bows WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $user_id]);
    $r = $stmt->fetch();
    if (!$r) res_error('Not found', 404);
    $r = bow_row_normalize($r);

    // Verknüpfte Pfeil-Sets mit ausliefern
    $arr = db()->prepare(
        'SELECT a.id, a.name, a.manufacturer, a.model, a.spine
         FROM bow_arrows ba JOIN arrows a ON a.id = ba.arrow_id
         WHERE ba.bow_id = ? ORDER BY a.name ASC'
    );
    $arr->execute([$id]);
    $r['linked_arrows'] = array_map(fn ($a) => [
        'id'           => (int)$a['id'],
        'name'         => $a['name'],
        'manufacturer' => $a['manufacturer'],
        'model'        => $a['model'],
        'spine'        => $a['spine'],
    ], $arr->fetchAll());

    // Verknüpftes Zubehör (Sehnen, Tabs, Releases, Sonstiges) mit ausliefern
    $eq = db()->prepare(
        'SELECT e.id, e.kind, e.sub_kind, e.name, e.manufacturer, e.model, e.retired_at,
                be.role
         FROM bow_equipment be JOIN equipment_items e ON e.id = be.equipment_item_id
         WHERE be.bow_id = ? ORDER BY e.kind ASC, e.name ASC'
    );
    $eq->execute([$id]);
    $r['linked_equipment'] = array_map(fn ($e) => [
        'id'           => (int)$e['id'],
        'kind'         => $e['kind'],
        'sub_kind'     => $e['sub_kind'],
        'name'         => $e['name'],
        'manufacturer' => $e['manufacturer'],
        'model'        => $e['model'],
        'retired_at'   => $e['retired_at'],
        'is_active'    => $e['retired_at'] === null,
        'role'         => $e['role'],
    ], $eq->fetchAll());

    res_json(['bow' => $r], $status);
}

function bows_image_upload(int $user_id, int $id): void
{
    $stmt = db()->prepare('SELECT image_path FROM bows WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    $rel = process_image_upload(BOWS_UPLOAD_DIR, sprintf('b%d', $id));
    delete_upload_file($row['image_path'] ?? null);

    db()->prepare('UPDATE bows SET image_path = ? WHERE id = ?')->execute([$rel, $id]);
    bow_detail($user_id, $id);
}

function bows_image_delete(int $user_id, int $id): void
{
    $stmt = db()->prepare('SELECT image_path FROM bows WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    delete_upload_file($row['image_path'] ?? null);
    db()->prepare('UPDATE bows SET image_path = NULL WHERE id = ?')->execute([$id]);
    bow_detail($user_id, $id);
}

// ─── Sight-Marks (Visiermarken) ─────────────────────────────────────────────

/** Owner-Check + Bow existiert. Wirft 404 wenn nicht. */
function sight_marks_require_owner(int $user_id, int $bow_id): void
{
    $stmt = db()->prepare('SELECT id FROM bows WHERE id = ? AND user_id = ?');
    $stmt->execute([$bow_id, $user_id]);
    if (!$stmt->fetch()) res_error('Bogen nicht gefunden', 404);
}

function sight_marks_list(int $user_id, int $bow_id): void
{
    sight_marks_require_owner($user_id, $bow_id);
    $stmt = db()->prepare('SELECT id, distance_m, mark_value, notes FROM bow_sight_marks WHERE bow_id = ? ORDER BY distance_m ASC');
    $stmt->execute([$bow_id]);
    $marks = array_map(fn($r) => [
        'id'         => (int)$r['id'],
        'distance_m' => (float)$r['distance_m'],
        'mark_value' => (float)$r['mark_value'],
        'notes'      => $r['notes'],
    ], $stmt->fetchAll());
    res_json(['marks' => $marks]);
}

function sight_marks_create(int $user_id, int $bow_id): void
{
    sight_marks_require_owner($user_id, $bow_id);
    $in = req_json();
    $distance_m = (float)($in['distance_m'] ?? 0);
    $mark_value = (float)($in['mark_value'] ?? 0);
    $notes      = isset($in['notes']) ? trim((string)$in['notes']) : null;
    if ($distance_m <= 0 || $distance_m > 200) res_error('Distanz muss zwischen 0 und 200 m liegen');

    try {
        db()->prepare('INSERT INTO bow_sight_marks (bow_id, distance_m, mark_value, notes) VALUES (?, ?, ?, ?)')
            ->execute([$bow_id, $distance_m, $mark_value, $notes ?: null]);
    } catch (PDOException $e) {
        // UNIQUE-Constraint: für diese Distanz existiert schon eine Marke
        if ((int)$e->getCode() === 23000) {
            res_error('Für diese Distanz ist bereits ein Wert hinterlegt — bearbeite den existierenden Eintrag', 409);
        }
        throw $e;
    }
    sight_marks_list($user_id, $bow_id);
}

function sight_marks_update(int $user_id, int $bow_id, int $sm_id): void
{
    sight_marks_require_owner($user_id, $bow_id);
    $in = req_json();
    $sets = [];
    $vals = [];
    if (array_key_exists('distance_m', $in)) {
        $d = (float)$in['distance_m'];
        if ($d <= 0 || $d > 200) res_error('Distanz muss zwischen 0 und 200 m liegen');
        $sets[] = 'distance_m = ?'; $vals[] = $d;
    }
    if (array_key_exists('mark_value', $in)) {
        $sets[] = 'mark_value = ?'; $vals[] = (float)$in['mark_value'];
    }
    if (array_key_exists('notes', $in)) {
        $sets[] = 'notes = ?'; $vals[] = trim((string)$in['notes']) ?: null;
    }
    if (!$sets) res_error('Nichts zu ändern');
    $vals[] = $sm_id;
    $vals[] = $bow_id;
    db()->prepare('UPDATE bow_sight_marks SET ' . implode(', ', $sets) . ' WHERE id = ? AND bow_id = ?')->execute($vals);
    sight_marks_list($user_id, $bow_id);
}

function sight_marks_delete(int $user_id, int $bow_id, int $sm_id): void
{
    sight_marks_require_owner($user_id, $bow_id);
    db()->prepare('DELETE FROM bow_sight_marks WHERE id = ? AND bow_id = ?')->execute([$sm_id, $bow_id]);
    sight_marks_list($user_id, $bow_id);
}
