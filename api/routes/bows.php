<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

const VALID_BOW_TYPES_BOW = ['recurve', 'compound', 'barebow', 'traditional'];

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
            'PATCH'  => bows_update($user['id'], $id),
            'DELETE' => bows_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    res_error('Not found', 404);
}

function bows_list(int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT id, name, bow_type, draw_weight_lbs, arrow_spine, sight_marks, notes, is_default, created_at, updated_at
         FROM bows WHERE user_id = ? ORDER BY is_default DESC, name ASC'
    );
    $stmt->execute([$user_id]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id']         = (int)$r['id'];
        $r['is_default'] = (bool)$r['is_default'];
        if ($r['draw_weight_lbs'] !== null) $r['draw_weight_lbs'] = (float)$r['draw_weight_lbs'];
    }
    unset($r);
    res_json(['bows' => $rows]);
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
            'INSERT INTO bows (user_id, name, bow_type, draw_weight_lbs, arrow_spine, sight_marks, notes, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $user_id,
            $name,
            $bow_type,
            isset($in['draw_weight_lbs']) && $in['draw_weight_lbs'] !== null && $in['draw_weight_lbs'] !== '' ? (float)$in['draw_weight_lbs'] : null,
            isset($in['arrow_spine']) ? (string)$in['arrow_spine'] : null,
            isset($in['sight_marks']) ? (string)$in['sight_marks'] : null,
            isset($in['notes']) ? (string)$in['notes'] : null,
            $is_default,
        ]);
        $id = (int)db()->lastInsertId();
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    bow_detail($user_id, $id, 201);
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
    foreach (['draw_weight_lbs','arrow_spine','sight_marks','notes'] as $f) {
        if (!array_key_exists($f, $in)) continue;
        $v = $in[$f];
        if ($f === 'draw_weight_lbs') {
            $sets[] = "$f = ?"; $vals[] = ($v === null || $v === '') ? null : (float)$v;
        } else {
            $sets[] = "$f = ?"; $vals[] = ($v === null || $v === '') ? null : (string)$v;
        }
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
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    bow_detail($user_id, $id);
}

function bows_delete(int $user_id, int $id): void
{
    db()->prepare('DELETE FROM bows WHERE id = ? AND user_id = ?')->execute([$id, $user_id]);
    res_json(['ok' => true]);
}

function bow_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare(
        'SELECT id, name, bow_type, draw_weight_lbs, arrow_spine, sight_marks, notes, is_default, created_at, updated_at
         FROM bows WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $user_id]);
    $r = $stmt->fetch();
    if (!$r) res_error('Not found', 404);
    $r['id']         = (int)$r['id'];
    $r['is_default'] = (bool)$r['is_default'];
    if ($r['draw_weight_lbs'] !== null) $r['draw_weight_lbs'] = (float)$r['draw_weight_lbs'];
    res_json(['bow' => $r], $status);
}
