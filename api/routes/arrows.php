<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Uploads.php';

const ARROW_MATERIALS    = ['carbon', 'aluminium', 'carbon_aluminium', 'wood', 'fiberglass'];
const ARROW_FLETCHINGS   = ['natural', 'vane', 'spin_vane'];
const ARROW_NOCK_TYPES   = ['press_fit', 'pin', 'other'];
const ARROW_TIP_TYPES    = ['field', 'target', 'bullet', 'broadhead'];
const ARROWS_UPLOAD_DIR  = '/uploads/arrows';

function handle_arrows(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/arrows'));

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'  => arrows_list($user['id']),
            'POST' => arrows_create($user['id']),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'    => arrow_detail($user['id'], $id),
            'PATCH'  => arrows_update($user['id'], $id),
            'DELETE' => arrows_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/image$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'POST'   => arrows_image_upload($user['id'], $id),
            'DELETE' => arrows_image_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    res_error('Not found', 404);
}

function arrows_list(int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT * FROM arrows WHERE user_id = ? ORDER BY is_default DESC, name ASC'
    );
    $stmt->execute([$user_id]);
    $rows = array_map(fn ($r) => arrow_serialize($r, false), $stmt->fetchAll());
    res_json(['arrows' => $rows]);
}

function arrow_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare('SELECT * FROM arrows WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);
    res_json(['arrow' => arrow_serialize($row, true)], $status);
}

function arrows_create(int $user_id): void
{
    $in = req_json();
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > 120) res_error('Ungültiger name');

    $bow_ids = arrow_extract_bow_ids($in);

    db()->beginTransaction();
    try {
        $is_default = arrow_resolve_is_default($user_id, !empty($in['is_default']));

        $fields = arrow_writable_fields_with_values($in);
        $cols   = ['user_id', 'name', 'is_default'];
        $marks  = ['?', '?', '?'];
        $vals   = [$user_id, $name, $is_default];
        foreach ($fields as $col => $val) {
            $cols[]  = $col;
            $marks[] = '?';
            $vals[]  = $val;
        }
        $sql = 'INSERT INTO arrows (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $marks) . ')';
        db()->prepare($sql)->execute($vals);
        $id = (int)db()->lastInsertId();

        arrow_set_bow_links($user_id, $id, $bow_ids);
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    arrow_detail($user_id, $id, 201);
}

function arrows_update(int $user_id, int $id): void
{
    $own = db()->prepare('SELECT id FROM arrows WHERE id = ? AND user_id = ?');
    $own->execute([$id, $user_id]);
    if (!$own->fetch()) res_error('Not found', 404);

    $in = req_json();

    db()->beginTransaction();
    try {
        $sets = []; $vals = [];

        if (array_key_exists('name', $in)) {
            $name = trim((string)$in['name']);
            if ($name === '' || mb_strlen($name) > 120) res_error('Ungültiger name');
            $sets[] = 'name = ?'; $vals[] = $name;
        }

        foreach (arrow_writable_fields_with_values($in) as $col => $val) {
            $sets[] = "$col = ?"; $vals[] = $val;
        }

        if (array_key_exists('is_default', $in)) {
            if ($in['is_default']) {
                db()->prepare('UPDATE arrows SET is_default = 0 WHERE user_id = ?')->execute([$user_id]);
                $sets[] = 'is_default = 1';
            } else {
                $sets[] = 'is_default = 0';
            }
        }

        if ($sets) {
            $vals[] = $id;
            db()->prepare('UPDATE arrows SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        }

        if (array_key_exists('bow_ids', $in)) {
            arrow_set_bow_links($user_id, $id, arrow_extract_bow_ids($in));
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    arrow_detail($user_id, $id);
}

function arrows_delete(int $user_id, int $id): void
{
    // Image-File mit löschen
    $s = db()->prepare('SELECT image_path FROM arrows WHERE id = ? AND user_id = ?');
    $s->execute([$id, $user_id]);
    $img = $s->fetchColumn();
    if ($img) delete_upload_file((string)$img);

    db()->prepare('DELETE FROM arrows WHERE id = ? AND user_id = ?')->execute([$id, $user_id]);
    res_json(['ok' => true]);
}

function arrows_image_upload(int $user_id, int $id): void
{
    $stmt = db()->prepare('SELECT image_path FROM arrows WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    $rel = process_image_upload(ARROWS_UPLOAD_DIR, sprintf('a%d', $id));
    delete_upload_file($row['image_path'] ?? null);

    db()->prepare('UPDATE arrows SET image_path = ? WHERE id = ?')->execute([$rel, $id]);
    arrow_detail($user_id, $id);
}

function arrows_image_delete(int $user_id, int $id): void
{
    $stmt = db()->prepare('SELECT image_path FROM arrows WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    delete_upload_file($row['image_path'] ?? null);
    db()->prepare('UPDATE arrows SET image_path = NULL WHERE id = ?')->execute([$id]);
    arrow_detail($user_id, $id);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function arrow_writable_fields_with_values(array $in): array
{
    $out = [];
    $string_fields = ['manufacturer', 'model', 'spine', 'fletching_colors', 'nock_manufacturer', 'nock_color', 'tip_manufacturer', 'notes'];
    foreach ($string_fields as $f) {
        if (array_key_exists($f, $in)) {
            $v = $in[$f];
            $out[$f] = ($v === null || $v === '') ? null : (string)$v;
        }
    }
    $decimal_fields = ['diameter_mm', 'length_inch', 'gpi', 'fletching_length_inch'];
    foreach ($decimal_fields as $f) {
        if (array_key_exists($f, $in)) {
            $v = $in[$f];
            $out[$f] = ($v === null || $v === '') ? null : (float)$v;
        }
    }
    $int_fields = ['fletching_count', 'tip_weight_grains', 'count_total', 'count_broken', 'count_lost', 'price_per_arrow_cents'];
    foreach ($int_fields as $f) {
        if (array_key_exists($f, $in)) {
            $v = $in[$f];
            $out[$f] = ($v === null || $v === '') ? null : (int)$v;
        }
    }
    $bool_fields = ['fletching_helix', 'tip_replaceable'];
    foreach ($bool_fields as $f) {
        if (array_key_exists($f, $in)) {
            $v = $in[$f];
            $out[$f] = $v === null ? null : ($v ? 1 : 0);
        }
    }
    if (array_key_exists('material', $in)) {
        $v = $in['material'];
        if ($v !== null && $v !== '' && !in_array($v, ARROW_MATERIALS, true)) res_error('Ungültiges material');
        $out['material'] = ($v === null || $v === '') ? null : $v;
    }
    if (array_key_exists('fletching_type', $in)) {
        $v = $in['fletching_type'];
        if ($v !== null && $v !== '' && !in_array($v, ARROW_FLETCHINGS, true)) res_error('Ungültiges fletching_type');
        $out['fletching_type'] = ($v === null || $v === '') ? null : $v;
    }
    if (array_key_exists('nock_type', $in)) {
        $v = $in['nock_type'];
        if ($v !== null && $v !== '' && !in_array($v, ARROW_NOCK_TYPES, true)) res_error('Ungültiges nock_type');
        $out['nock_type'] = ($v === null || $v === '') ? null : $v;
    }
    if (array_key_exists('tip_type', $in)) {
        $v = $in['tip_type'];
        if ($v !== null && $v !== '' && !in_array($v, ARROW_TIP_TYPES, true)) res_error('Ungültiges tip_type');
        $out['tip_type'] = ($v === null || $v === '') ? null : $v;
    }
    if (array_key_exists('purchased_at', $in)) {
        $v = $in['purchased_at'];
        if ($v === null || $v === '') {
            $out['purchased_at'] = null;
        } else {
            $ts = strtotime((string)$v);
            $out['purchased_at'] = $ts === false ? null : date('Y-m-d', $ts);
        }
    }
    return $out;
}

function arrow_extract_bow_ids(array $in): ?array
{
    if (!array_key_exists('bow_ids', $in)) return null;
    if (!is_array($in['bow_ids'])) return [];
    $ids = [];
    foreach ($in['bow_ids'] as $v) {
        $id = (int)$v;
        if ($id > 0) $ids[] = $id;
    }
    return array_values(array_unique($ids));
}

function arrow_set_bow_links(int $user_id, int $arrow_id, ?array $bow_ids): void
{
    if ($bow_ids === null) return;
    db()->prepare('DELETE FROM bow_arrows WHERE arrow_id = ?')->execute([$arrow_id]);
    if (empty($bow_ids)) return;

    // Nur dem User gehörende Bows zulassen
    $marks = implode(',', array_fill(0, count($bow_ids), '?'));
    $stmt  = db()->prepare("SELECT id FROM bows WHERE id IN ($marks) AND user_id = ?");
    $stmt->execute([...$bow_ids, $user_id]);
    $allowed = array_map('intval', array_column($stmt->fetchAll(), 'id'));

    if (!$allowed) return;
    $ins = db()->prepare('INSERT IGNORE INTO bow_arrows (bow_id, arrow_id) VALUES (?, ?)');
    foreach ($allowed as $bid) $ins->execute([$bid, $arrow_id]);
}

function arrow_resolve_is_default(int $user_id, bool $wants): int
{
    if ($wants) {
        db()->prepare('UPDATE arrows SET is_default = 0 WHERE user_id = ?')->execute([$user_id]);
        return 1;
    }
    $c = db()->prepare('SELECT COUNT(*) FROM arrows WHERE user_id = ?');
    $c->execute([$user_id]);
    return (int)$c->fetchColumn() === 0 ? 1 : 0;
}

function arrow_serialize(array $r, bool $include_bows): array
{
    $out = [
        'id'                    => (int)$r['id'],
        'name'                  => $r['name'],
        'manufacturer'          => $r['manufacturer'],
        'model'                 => $r['model'],
        'material'              => $r['material'],
        'diameter_mm'           => $r['diameter_mm'] !== null ? (float)$r['diameter_mm'] : null,
        'spine'                 => $r['spine'],
        'length_inch'           => $r['length_inch'] !== null ? (float)$r['length_inch'] : null,
        'gpi'                   => $r['gpi'] !== null ? (float)$r['gpi'] : null,
        'fletching_type'        => $r['fletching_type'],
        'fletching_length_inch' => $r['fletching_length_inch'] !== null ? (float)$r['fletching_length_inch'] : null,
        'fletching_count'       => $r['fletching_count'] !== null ? (int)$r['fletching_count'] : null,
        'fletching_helix'       => $r['fletching_helix'] !== null ? (bool)$r['fletching_helix'] : null,
        'fletching_colors'      => $r['fletching_colors'],
        'nock_type'             => $r['nock_type'],
        'nock_manufacturer'     => $r['nock_manufacturer'],
        'nock_color'            => $r['nock_color'],
        'tip_type'              => $r['tip_type'],
        'tip_weight_grains'     => $r['tip_weight_grains'] !== null ? (int)$r['tip_weight_grains'] : null,
        'tip_manufacturer'      => $r['tip_manufacturer'],
        'tip_replaceable'       => $r['tip_replaceable'] !== null ? (bool)$r['tip_replaceable'] : null,
        'count_total'           => $r['count_total'] !== null ? (int)$r['count_total'] : null,
        'count_broken'          => (int)$r['count_broken'],
        'count_lost'            => (int)$r['count_lost'],
        'purchased_at'          => $r['purchased_at'],
        'price_per_arrow_cents' => $r['price_per_arrow_cents'] !== null ? (int)$r['price_per_arrow_cents'] : null,
        'notes'                 => $r['notes'],
        'image_path'            => $r['image_path'],
        'image_url'             => $r['image_path'] ?: null,
        'is_default'            => (bool)$r['is_default'],
        'created_at'            => $r['created_at'],
        'updated_at'            => $r['updated_at'],
    ];
    if ($include_bows) {
        $s = db()->prepare(
            'SELECT b.id, b.name, b.bow_type
             FROM bow_arrows ba JOIN bows b ON b.id = ba.bow_id
             WHERE ba.arrow_id = ? ORDER BY b.name ASC'
        );
        $s->execute([(int)$r['id']]);
        $out['linked_bows'] = array_map(fn ($b) => [
            'id'       => (int)$b['id'],
            'name'     => $b['name'],
            'bow_type' => $b['bow_type'],
        ], $s->fetchAll());
    }
    return $out;
}
