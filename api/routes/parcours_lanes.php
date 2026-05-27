<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Uploads.php';

const LANES_UPLOAD_DIR = '/uploads/lanes';

/**
 * Bahnen-Verwaltung pro Parcours.
 *
 *  GET    /parcours/<id>/lanes                          → Liste
 *  POST   /parcours/<id>/lanes                          → Bahn anlegen / upserten
 *  PATCH  /parcours/<id>/lanes/<lane_id>                → Bahn updaten
 *  DELETE /parcours/<id>/lanes/<lane_id>                → Bahn löschen
 *  POST   /parcours/<id>/lanes/<lane_id>/image          → Foto-Upload
 *  DELETE /parcours/<id>/lanes/<lane_id>/image          → Foto entfernen
 *  PUT    /parcours/<id>/lanes/<lane_id>/distance-estimate
 *                                                      → eigene Schätzung setzen
 *  DELETE /parcours/<id>/lanes/<lane_id>/distance-estimate
 *                                                      → eigene Schätzung zurückziehen
 */
function handle_parcours_lanes(string $method, int $user_id, int $parcours_id, string $rest): void
{
    // Read-Access: eigene Parcours ODER öffentliche
    $accessible = lanes_parcours_accessible($user_id, $parcours_id);
    if (!$accessible) res_error('Not found', 404);
    $owned = $accessible === 'owner';

    // /lanes
    if ($rest === '' || $rest === '/') {
        if ($method === 'GET') { lanes_list($parcours_id, $user_id); return; }
        if ($method === 'POST') {
            if (!$owned) res_error('Nur der Parcours-Owner kann Bahnen anlegen', 403);
            lanes_upsert($parcours_id, $user_id);
            return;
        }
        res_error('Method not allowed', 405);
    }
    // /lanes/<id>
    if (preg_match('#^/(\d+)$#', $rest, $m)) {
        $lid = (int)$m[1];
        if ($method === 'PATCH' || $method === 'DELETE') {
            if (!$owned) res_error('Nur der Parcours-Owner kann Bahnen ändern', 403);
            if ($method === 'PATCH') lanes_update($parcours_id, $lid, $user_id);
            else lanes_delete($parcours_id, $lid);
            return;
        }
        res_error('Method not allowed', 405);
    }
    // /lanes/<id>/image
    if (preg_match('#^/(\d+)/image$#', $rest, $m)) {
        $lid = (int)$m[1];
        if (!$owned) res_error('Nur der Parcours-Owner kann Bahn-Fotos verwalten', 403);
        if ($method === 'POST')   { lanes_image_upload($parcours_id, $lid, $user_id); return; }
        if ($method === 'DELETE') { lanes_image_delete($parcours_id, $lid, $user_id); return; }
        res_error('Method not allowed', 405);
    }
    // /lanes/<id>/distance-estimate — jeder authentifizierte User darf schätzen
    if (preg_match('#^/(\d+)/distance-estimate$#', $rest, $m)) {
        $lid = (int)$m[1];
        if ($method === 'PUT')    { lanes_distance_estimate_upsert($parcours_id, $lid, $user_id); return; }
        if ($method === 'DELETE') { lanes_distance_estimate_delete($parcours_id, $lid, $user_id); return; }
        res_error('Method not allowed', 405);
    }

    res_error('Not found', 404);
}

/** Prüft Zugriff: 'owner' wenn User-eigen, 'public' wenn fremder is_public, sonst null. */
function lanes_parcours_accessible(int $user_id, int $parcours_id): ?string
{
    $s = db()->prepare('SELECT user_id, is_public FROM parcours WHERE id = ?');
    $s->execute([$parcours_id]);
    $row = $s->fetch();
    if (!$row) return null;
    if ((int)$row['user_id'] === $user_id) return 'owner';
    if ((int)$row['is_public'] === 1) return 'public';
    return null;
}

function lanes_list(int $parcours_id, int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT id, parcours_id, lane_number, animal_description,
                distance_blue, distance_red, distance_yellow, distance_white,
                notes, image_path, sort_order, created_at, updated_at
         FROM parcours_lanes
         WHERE parcours_id = ?
         ORDER BY sort_order ASC, lane_number ASC'
    );
    $stmt->execute([$parcours_id]);
    $rows = $stmt->fetchAll();
    $aggs = lanes_load_distance_aggregates(
        array_map(fn($r) => (int)$r['id'], $rows),
        $user_id
    );
    $rows = array_map(fn($r) => lane_serialize($r, $aggs[(int)$r['id']] ?? null), $rows);
    res_json(['lanes' => $rows]);
}

function lanes_upsert(int $parcours_id, int $user_id): void
{
    $in = req_json();
    $lane_number = (int)($in['lane_number'] ?? 0);
    if ($lane_number < 1) res_error('lane_number erforderlich (>=1)');

    db()->prepare(
        'INSERT INTO parcours_lanes
            (parcours_id, lane_number, animal_description,
             distance_blue, distance_red, distance_yellow, distance_white,
             notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            animal_description = VALUES(animal_description),
            distance_blue      = VALUES(distance_blue),
            distance_red       = VALUES(distance_red),
            distance_yellow    = VALUES(distance_yellow),
            distance_white     = VALUES(distance_white),
            notes              = VALUES(notes),
            sort_order         = VALUES(sort_order)'
    )->execute([
        $parcours_id,
        $lane_number,
        lane_field_string($in, 'animal_description'),
        lane_field_float($in, 'distance_blue'),
        lane_field_float($in, 'distance_red'),
        lane_field_float($in, 'distance_yellow'),
        lane_field_float($in, 'distance_white'),
        lane_field_string($in, 'notes'),
        isset($in['sort_order']) ? (int)$in['sort_order'] : $lane_number,
    ]);
    $lid = (int)db()->lastInsertId();
    if ($lid === 0) {
        $s = db()->prepare('SELECT id FROM parcours_lanes WHERE parcours_id = ? AND lane_number = ?');
        $s->execute([$parcours_id, $lane_number]);
        $lid = (int)$s->fetchColumn();
    }
    lane_detail($parcours_id, $lid, $user_id, 201);
}

function lanes_update(int $parcours_id, int $lid, int $user_id): void
{
    $in = req_json();
    $sets = [];
    $vals = [];

    foreach (['animal_description', 'notes'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] === null || $in[$f] === '' ? null : (string)$in[$f];
        }
    }
    foreach (['distance_blue', 'distance_red', 'distance_yellow', 'distance_white'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = ($in[$f] === null || $in[$f] === '') ? null : (float)$in[$f];
        }
    }
    if (array_key_exists('lane_number', $in)) {
        $sets[] = "lane_number = ?"; $vals[] = (int)$in['lane_number'];
    }
    if (array_key_exists('sort_order', $in)) {
        $sets[] = "sort_order = ?"; $vals[] = (int)$in['sort_order'];
    }
    if ($sets) {
        $vals[] = $lid; $vals[] = $parcours_id;
        db()->prepare("UPDATE parcours_lanes SET " . implode(', ', $sets) . " WHERE id = ? AND parcours_id = ?")
            ->execute($vals);
    }
    lane_detail($parcours_id, $lid, $user_id);
}

function lanes_delete(int $parcours_id, int $lid): void
{
    // Foto mitlöschen
    $stmt = db()->prepare('SELECT image_path FROM parcours_lanes WHERE id = ? AND parcours_id = ?');
    $stmt->execute([$lid, $parcours_id]);
    $img = $stmt->fetchColumn();
    if ($img) delete_upload_file((string)$img);

    db()->prepare('DELETE FROM parcours_lanes WHERE id = ? AND parcours_id = ?')->execute([$lid, $parcours_id]);
    res_json(['ok' => true]);
}

function lanes_image_upload(int $parcours_id, int $lid, int $user_id): void
{
    $stmt = db()->prepare('SELECT image_path FROM parcours_lanes WHERE id = ? AND parcours_id = ?');
    $stmt->execute([$lid, $parcours_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    $rel = process_image_upload(LANES_UPLOAD_DIR, sprintf('l%d', $lid));
    delete_upload_file($row['image_path'] ?? null);

    db()->prepare('UPDATE parcours_lanes SET image_path = ? WHERE id = ?')->execute([$rel, $lid]);
    lane_detail($parcours_id, $lid, $user_id);
}

function lanes_image_delete(int $parcours_id, int $lid, int $user_id): void
{
    $stmt = db()->prepare('SELECT image_path FROM parcours_lanes WHERE id = ? AND parcours_id = ?');
    $stmt->execute([$lid, $parcours_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);

    delete_upload_file($row['image_path'] ?? null);
    db()->prepare('UPDATE parcours_lanes SET image_path = NULL WHERE id = ?')->execute([$lid]);
    lane_detail($parcours_id, $lid, $user_id);
}

function lane_detail(int $parcours_id, int $lid, int $user_id, int $status = 200): void
{
    $stmt = db()->prepare(
        'SELECT id, parcours_id, lane_number, animal_description,
                distance_blue, distance_red, distance_yellow, distance_white,
                notes, image_path, sort_order, created_at, updated_at
         FROM parcours_lanes WHERE id = ? AND parcours_id = ?'
    );
    $stmt->execute([$lid, $parcours_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);
    $aggs = lanes_load_distance_aggregates([$lid], $user_id);
    res_json(['lane' => lane_serialize($row, $aggs[$lid] ?? null)], $status);
}

function lane_serialize(array $r, ?array $agg = null): array
{
    return [
        'id'                 => (int)$r['id'],
        'parcours_id'        => (int)$r['parcours_id'],
        'lane_number'        => (int)$r['lane_number'],
        'animal_description' => $r['animal_description'],
        'distance_blue'      => $r['distance_blue']   !== null ? (float)$r['distance_blue']   : null,
        'distance_red'       => $r['distance_red']    !== null ? (float)$r['distance_red']    : null,
        'distance_yellow'    => $r['distance_yellow'] !== null ? (float)$r['distance_yellow'] : null,
        'distance_white'     => $r['distance_white']  !== null ? (float)$r['distance_white']  : null,
        'notes'              => $r['notes'],
        'image_path'         => $r['image_path'],
        'image_url'          => $r['image_path'] ?: null,
        'sort_order'         => (int)$r['sort_order'],
        'created_at'         => $r['created_at'],
        'updated_at'         => $r['updated_at'],
        // Crowdsourced-Distanz-Aggregat (anonym, nur Median + n) plus eigene Schätzung
        'crowd_distance_median' => $agg['median'] ?? null,
        'crowd_distance_min'    => $agg['min']    ?? null,
        'crowd_distance_max'    => $agg['max']    ?? null,
        'crowd_distance_count'  => $agg['count']  ?? 0,
        'my_distance_estimate'  => $agg['mine']   ?? null,
    ];
}

// ─── Crowdsourced-Distanz-Aggregate + eigene Schätzung ────────────────────

/**
 * Lädt alle Schätzungen zu den gegebenen lane_ids und liefert pro lane_id
 * { median, min, max, count, mine } — wobei "mine" der Wert des aufrufenden
 * Users ist (oder null). Aggregate sind anonym.
 *
 * @param int[] $lane_ids
 * @return array<int, array{median:?float, min:?float, max:?float, count:int, mine:?float}>
 */
function lanes_load_distance_aggregates(array $lane_ids, int $user_id): array
{
    if (!$lane_ids) return [];
    $placeholders = implode(',', array_fill(0, count($lane_ids), '?'));
    $stmt = db()->prepare(
        "SELECT lane_id, user_id, estimated_distance_m
         FROM parcours_lane_distance_estimates
         WHERE lane_id IN ($placeholders)"
    );
    $stmt->execute($lane_ids);
    $byLane = [];
    foreach ($stmt->fetchAll() as $r) {
        $lid = (int)$r['lane_id'];
        if (!isset($byLane[$lid])) $byLane[$lid] = ['vals' => [], 'mine' => null];
        $val = (float)$r['estimated_distance_m'];
        $byLane[$lid]['vals'][] = $val;
        if ((int)$r['user_id'] === $user_id) $byLane[$lid]['mine'] = $val;
    }
    $out = [];
    foreach ($byLane as $lid => $d) {
        $vals = $d['vals'];
        sort($vals);
        $n = count($vals);
        if ($n === 0) {
            $median = null;
        } elseif ($n % 2 === 1) {
            $median = $vals[intdiv($n, 2)];
        } else {
            $median = ($vals[$n / 2 - 1] + $vals[$n / 2]) / 2;
        }
        $out[$lid] = [
            'median' => $median !== null ? round((float)$median, 1) : null,
            'min'    => $n > 0 ? round((float)$vals[0], 1)    : null,
            'max'    => $n > 0 ? round((float)$vals[$n - 1], 1) : null,
            'count'  => $n,
            'mine'   => $d['mine'],
        ];
    }
    return $out;
}

function lanes_distance_estimate_upsert(int $parcours_id, int $lid, int $user_id): void
{
    // Lane muss zum Parcours gehören
    $s = db()->prepare('SELECT id FROM parcours_lanes WHERE id = ? AND parcours_id = ?');
    $s->execute([$lid, $parcours_id]);
    if (!$s->fetchColumn()) res_error('Bahn nicht gefunden', 404);

    $in = req_json();
    $raw = $in['estimated_distance_m'] ?? null;
    if ($raw === null || $raw === '') res_error('estimated_distance_m erforderlich');
    $dist = (float)$raw;
    if ($dist <= 0 || $dist > 200) res_error('Distanz muss zwischen 0 und 200 m liegen');

    db()->prepare(
        'INSERT INTO parcours_lane_distance_estimates (lane_id, user_id, estimated_distance_m)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE estimated_distance_m = VALUES(estimated_distance_m)'
    )->execute([$lid, $user_id, $dist]);

    lane_detail($parcours_id, $lid, $user_id);
}

function lanes_distance_estimate_delete(int $parcours_id, int $lid, int $user_id): void
{
    $s = db()->prepare('SELECT id FROM parcours_lanes WHERE id = ? AND parcours_id = ?');
    $s->execute([$lid, $parcours_id]);
    if (!$s->fetchColumn()) res_error('Bahn nicht gefunden', 404);

    db()->prepare('DELETE FROM parcours_lane_distance_estimates WHERE lane_id = ? AND user_id = ?')
        ->execute([$lid, $user_id]);

    lane_detail($parcours_id, $lid, $user_id);
}

function lane_field_string(array $in, string $key): ?string
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    return (string)$in[$key];
}
function lane_field_float(array $in, string $key): ?float
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    return (float)$in[$key];
}
