<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

const EQUIPMENT_KINDS       = ['string', 'tab', 'release', 'other'];
const EQUIPMENT_EVENT_KINDS = ['broken', 'lost', 'service', 'added', 'retired'];

function handle_equipment(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/equipment'));

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'  => equipment_list($user['id']),
            'POST' => equipment_create($user['id']),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'    => equipment_detail($user['id'], $id),
            'PATCH'  => equipment_update($user['id'], $id),
            'DELETE' => equipment_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/events$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'  => equipment_events_list($user['id'], $id),
            'POST' => equipment_events_create($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/events/(\d+)$#', $sub, $m)) {
        $eq_id = (int)$m[1]; $event_id = (int)$m[2];
        if ($method !== 'DELETE') res_error('Method not allowed', 405);
        equipment_events_delete($user['id'], $eq_id, $event_id);
        return;
    }

    res_error('Not found', 404);
}

function equipment_assert_own(int $user_id, int $eq_id): void
{
    $s = db()->prepare('SELECT id FROM equipment_items WHERE id = ? AND user_id = ?');
    $s->execute([$eq_id, $user_id]);
    if (!$s->fetch()) res_error('Not found', 404);
}

function equipment_list(int $user_id): void
{
    $kind = req_query('kind');
    $sql  = 'SELECT * FROM equipment_items WHERE user_id = ?';
    $args = [$user_id];
    if ($kind !== null && in_array($kind, EQUIPMENT_KINDS, true)) {
        $sql .= ' AND kind = ?';
        $args[] = $kind;
    }
    $sql .= ' ORDER BY retired_at IS NOT NULL ASC, is_default DESC, name ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    $rows = array_map(fn ($r) => equipment_serialize($r), $stmt->fetchAll());
    res_json(['items' => $rows]);
}

function equipment_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare('SELECT * FROM equipment_items WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);
    res_json(['item' => equipment_serialize($row)], $status);
}

function equipment_create(int $user_id): void
{
    $in = req_json();
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '' || mb_strlen($name) > 120) res_error('Ungültiger name');
    $kind = (string)($in['kind'] ?? '');
    if (!in_array($kind, EQUIPMENT_KINDS, true)) res_error('Ungültiges kind');

    db()->beginTransaction();
    try {
        $is_default = equipment_resolve_is_default($user_id, $kind, !empty($in['is_default']));
        $fields = equipment_writable_fields($in);
        $cols   = ['user_id', 'kind', 'name', 'is_default'];
        $marks  = ['?', '?', '?', '?'];
        $vals   = [$user_id, $kind, $name, $is_default];
        foreach ($fields as $col => $val) {
            $cols[]  = $col;
            $marks[] = '?';
            $vals[]  = $val;
        }
        $sql = 'INSERT INTO equipment_items (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $marks) . ')';
        db()->prepare($sql)->execute($vals);
        $id = (int)db()->lastInsertId();
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    equipment_detail($user_id, $id, 201);
}

function equipment_update(int $user_id, int $id): void
{
    equipment_assert_own($user_id, $id);
    $in = req_json();

    db()->beginTransaction();
    try {
        $sets = []; $vals = [];

        if (array_key_exists('name', $in)) {
            $name = trim((string)$in['name']);
            if ($name === '' || mb_strlen($name) > 120) res_error('Ungültiger name');
            $sets[] = 'name = ?'; $vals[] = $name;
        }
        if (array_key_exists('kind', $in)) {
            $k = (string)$in['kind'];
            if (!in_array($k, EQUIPMENT_KINDS, true)) res_error('Ungültiges kind');
            $sets[] = 'kind = ?'; $vals[] = $k;
        }
        foreach (equipment_writable_fields($in) as $col => $val) {
            $sets[] = "$col = ?"; $vals[] = $val;
        }
        if (array_key_exists('is_default', $in)) {
            if ($in['is_default']) {
                // Reset default für gleiche kind
                $cur = db()->prepare('SELECT kind FROM equipment_items WHERE id = ?');
                $cur->execute([$id]);
                $kind = (string)$cur->fetchColumn();
                db()->prepare('UPDATE equipment_items SET is_default = 0 WHERE user_id = ? AND kind = ?')
                    ->execute([$user_id, $kind]);
                $sets[] = 'is_default = 1';
            } else {
                $sets[] = 'is_default = 0';
            }
        }

        if ($sets) {
            $vals[] = $id;
            db()->prepare('UPDATE equipment_items SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    equipment_detail($user_id, $id);
}

function equipment_delete(int $user_id, int $id): void
{
    db()->prepare('DELETE FROM equipment_items WHERE id = ? AND user_id = ?')->execute([$id, $user_id]);
    res_json(['ok' => true]);
}

function equipment_events_list(int $user_id, int $eq_id): void
{
    equipment_assert_own($user_id, $eq_id);
    $s = db()->prepare(
        'SELECT id, kind, occurred_at, notes, created_at
         FROM equipment_events WHERE equipment_item_id = ?
         ORDER BY occurred_at DESC, id DESC'
    );
    $s->execute([$eq_id]);
    $rows = array_map(fn ($r) => [
        'id'          => (int)$r['id'],
        'kind'        => $r['kind'],
        'occurred_at' => $r['occurred_at'],
        'notes'       => $r['notes'],
        'created_at'  => $r['created_at'],
    ], $s->fetchAll());
    res_json(['events' => $rows]);
}

function equipment_events_create(int $user_id, int $eq_id): void
{
    equipment_assert_own($user_id, $eq_id);
    $in = req_json();
    $kind = (string)($in['kind'] ?? '');
    if (!in_array($kind, EQUIPMENT_EVENT_KINDS, true)) res_error('Ungültiges event-kind');
    $when = (string)($in['occurred_at'] ?? '');
    if ($when !== '') {
        $ts = strtotime($when);
        $when = $ts === false ? date('Y-m-d') : date('Y-m-d', $ts);
    } else {
        $when = date('Y-m-d');
    }
    $notes = isset($in['notes']) && $in['notes'] !== '' ? (string)$in['notes'] : null;

    db()->beginTransaction();
    try {
        db()->prepare(
            'INSERT INTO equipment_events (equipment_item_id, kind, occurred_at, notes) VALUES (?, ?, ?, ?)'
        )->execute([$eq_id, $kind, $when, $notes]);

        // 'retired' bzw. 'broken'/'lost' setzen retired_at automatisch (Lifecycle-Ende).
        // 'service'/'added' lassen das Item aktiv.
        if (in_array($kind, ['retired', 'broken', 'lost'], true)) {
            db()->prepare('UPDATE equipment_items SET retired_at = ? WHERE id = ? AND retired_at IS NULL')
                ->execute([$when, $eq_id]);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    equipment_events_list($user_id, $eq_id);
}

function equipment_events_delete(int $user_id, int $eq_id, int $event_id): void
{
    equipment_assert_own($user_id, $eq_id);
    // Wenn das Event ein Lifecycle-End war und kein anderes End-Event existiert,
    // räumen wir retired_at wieder auf — sonst hängt das Item ewig im retired-Status.
    $s = db()->prepare('SELECT kind FROM equipment_events WHERE id = ? AND equipment_item_id = ?');
    $s->execute([$event_id, $eq_id]);
    $e = $s->fetch();
    if (!$e) res_error('Not found', 404);

    db()->beginTransaction();
    try {
        db()->prepare('DELETE FROM equipment_events WHERE id = ?')->execute([$event_id]);
        if (in_array($e['kind'], ['retired', 'broken', 'lost'], true)) {
            $other = db()->prepare(
                "SELECT COUNT(*) FROM equipment_events
                 WHERE equipment_item_id = ? AND kind IN ('retired','broken','lost')"
            );
            $other->execute([$eq_id]);
            if ((int)$other->fetchColumn() === 0) {
                db()->prepare('UPDATE equipment_items SET retired_at = NULL WHERE id = ?')->execute([$eq_id]);
            }
        }
        db()->commit();
    } catch (Throwable $ex) {
        db()->rollBack();
        throw $ex;
    }
    equipment_events_list($user_id, $eq_id);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function equipment_writable_fields(array $in): array
{
    $out = [];
    $string_fields = ['sub_kind', 'manufacturer', 'model', 'notes', 'purchase_url', 'specs'];
    foreach ($string_fields as $f) {
        if (array_key_exists($f, $in)) {
            $v = $in[$f];
            $out[$f] = ($v === null || $v === '') ? null : (string)$v;
        }
    }
    if (array_key_exists('price_cents', $in)) {
        $v = $in['price_cents'];
        $out['price_cents'] = ($v === null || $v === '') ? null : (int)$v;
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

function equipment_resolve_is_default(int $user_id, string $kind, bool $wants): int
{
    if ($wants) {
        db()->prepare('UPDATE equipment_items SET is_default = 0 WHERE user_id = ? AND kind = ?')
            ->execute([$user_id, $kind]);
        return 1;
    }
    $c = db()->prepare('SELECT COUNT(*) FROM equipment_items WHERE user_id = ? AND kind = ?');
    $c->execute([$user_id, $kind]);
    return (int)$c->fetchColumn() === 0 ? 1 : 0;
}

function equipment_serialize(array $r): array
{
    return [
        'id'           => (int)$r['id'],
        'kind'         => $r['kind'],
        'sub_kind'     => $r['sub_kind'],
        'name'         => $r['name'],
        'manufacturer' => $r['manufacturer'],
        'model'        => $r['model'],
        'notes'        => $r['notes'],
        'image_path'   => $r['image_path'],
        'purchase_url' => $r['purchase_url'],
        'purchased_at' => $r['purchased_at'],
        'price_cents'  => $r['price_cents'] !== null ? (int)$r['price_cents'] : null,
        'retired_at'   => $r['retired_at'],
        'is_active'    => $r['retired_at'] === null,
        'specs'        => $r['specs'],
        'is_default'   => (bool)$r['is_default'],
        'created_at'   => $r['created_at'],
        'updated_at'   => $r['updated_at'],
    ];
}
