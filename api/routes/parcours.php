<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

const UPLOAD_DIR_REL = '/uploads/parcours';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function handle_parcours(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/parcours'));

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'  => parcours_list($user['id']),
            'POST' => parcours_create($user['id']),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'GET'    => parcours_detail($user['id'], $id),
            'PATCH'  => parcours_update($user['id'], $id),
            'DELETE' => parcours_delete($user['id'], $id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }

    if (preg_match('#^/(\d+)/image$#', $sub, $m)) {
        $id = (int)$m[1];
        match ($method) {
            'POST' => parcours_image_upload($user['id'], $id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }

    // Lanes-Subroutes: /parcours/<id>/lanes[/...]
    if (preg_match('#^/(\d+)/lanes(.*)$#', $sub, $m)) {
        require_once __DIR__ . '/parcours_lanes.php';
        handle_parcours_lanes($method, $user['id'], (int)$m[1], $m[2]);
        return;
    }

    // Reviews-Subroutes: /parcours/<id>/reviews[/<rid>]
    if (preg_match('#^/(\d+)/reviews(.*)$#', $sub, $m)) {
        require_once __DIR__ . '/parcours_reviews.php';
        handle_parcours_reviews($method, $user['id'], (int)$m[1], $m[2]);
        return;
    }

    // Clone (Vorlage übernehmen): /parcours/<id>/clone
    if (preg_match('#^/(\d+)/clone$#', $sub, $m)) {
        if ($method !== 'POST') res_error('Method not allowed', 405);
        parcours_clone($user['id'], (int)$m[1]);
        return;
    }

    res_error('Not found', 404);
}

function parcours_list(int $user_id): void
{
    // Modi: 'mine' (default, nur eigene), 'public' (nur öffentliche fremde), 'all'
    // Legacy: include_public=1 → entspricht 'all'
    $mode = req_query('mode', '');
    if ($mode === '' && req_query('include_public', '0') === '1') $mode = 'all';
    if ($mode === '') $mode = 'mine';

    if ($mode === 'all') {
        $sql = 'SELECT p.*, u.display_name AS user_display_name, u.avatar_path AS user_avatar_path
                FROM parcours p JOIN users u ON u.id = p.user_id
                WHERE p.user_id = ? OR p.is_public = 1
                ORDER BY p.name ASC';
        $stmt = db()->prepare($sql);
        $stmt->execute([$user_id]);
    } elseif ($mode === 'public') {
        $sql = 'SELECT p.*, u.display_name AS user_display_name, u.avatar_path AS user_avatar_path
                FROM parcours p JOIN users u ON u.id = p.user_id
                WHERE p.is_public = 1 AND p.user_id != ?
                ORDER BY p.name ASC';
        $stmt = db()->prepare($sql);
        $stmt->execute([$user_id]);
    } else {
        $sql = 'SELECT p.*, u.display_name AS user_display_name, u.avatar_path AS user_avatar_path
                FROM parcours p JOIN users u ON u.id = p.user_id
                WHERE p.user_id = ?
                ORDER BY p.name ASC';
        $stmt = db()->prepare($sql);
        $stmt->execute([$user_id]);
    }
    $items = array_map('parcours_serialize', $stmt->fetchAll());
    res_json(['parcours' => $items]);
}

function parcours_create(int $user_id): void
{
    $in = req_json();
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '') res_error('Name erforderlich');

    $stmt = db()->prepare(
        'INSERT INTO parcours
            (user_id, name, description, address, lat, lng, is_public,
             lanes_count, price_info, opening_hours, website, contact_email, contact_phone,
             difficulty, terrain, peg_blue, peg_red, peg_yellow, peg_white,
             duration_min, season_note, access_note, last_refresh_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $user_id,
        $name,
        parcours_field_string($in, 'description'),
        parcours_field_string($in, 'address'),
        parcours_field_float($in,  'lat'),
        parcours_field_float($in,  'lng'),
        !empty($in['is_public']) ? 1 : 0,
        parcours_field_int($in,    'lanes_count'),
        parcours_field_string($in, 'price_info'),
        parcours_field_string($in, 'opening_hours'),
        parcours_field_string($in, 'website'),
        parcours_field_string($in, 'contact_email'),
        parcours_field_string($in, 'contact_phone'),
        parcours_field_difficulty($in),
        parcours_field_string($in, 'terrain'),
        !empty($in['peg_blue'])   ? 1 : 0,
        !empty($in['peg_red'])    ? 1 : 0,
        !empty($in['peg_yellow']) ? 1 : 0,
        !empty($in['peg_white'])  ? 1 : 0,
        parcours_field_int($in,    'duration_min'),
        parcours_field_string($in, 'season_note'),
        parcours_field_string($in, 'access_note'),
        parcours_field_date($in,   'last_refresh_date'),
    ]);
    $id = (int)db()->lastInsertId();
    parcours_detail($user_id, $id, 201);
}

function parcours_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare(
        'SELECT p.*, u.display_name AS user_display_name, u.avatar_path AS user_avatar_path
         FROM parcours p JOIN users u ON u.id = p.user_id
         WHERE p.id = ? AND (p.user_id = ? OR p.is_public = 1)'
    );
    $stmt->execute([$id, $user_id]);
    $row = $stmt->fetch();
    if (!$row) res_error('Not found', 404);
    res_json(['parcours' => parcours_serialize($row)], $status);
}

function parcours_update(int $user_id, int $id): void
{
    if (!parcours_owned($user_id, $id)) res_error('Not found', 404);
    $in = req_json();

    $sets = [];
    $vals = [];

    // String-Felder (alle nullable)
    foreach (['name', 'description', 'address', 'price_info', 'opening_hours', 'website',
              'contact_email', 'contact_phone', 'terrain', 'season_note', 'access_note'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] === null || $in[$f] === '' ? null : (string)$in[$f];
        }
    }
    // Float
    foreach (['lat', 'lng'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] === null ? null : (float)$in[$f];
        }
    }
    // Int (nullable)
    foreach (['lanes_count', 'duration_min'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = ($in[$f] === null || $in[$f] === '') ? null : (int)$in[$f];
        }
    }
    // Booleans
    foreach (['is_public', 'peg_blue', 'peg_red', 'peg_yellow', 'peg_white'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] ? 1 : 0;
        }
    }
    // Difficulty 1-5
    if (array_key_exists('difficulty', $in)) {
        $sets[] = "difficulty = ?";
        $val = ($in['difficulty'] === null || $in['difficulty'] === '') ? null : (int)$in['difficulty'];
        if ($val !== null && ($val < 1 || $val > 5)) $val = null;
        $vals[] = $val;
    }
    // Date
    if (array_key_exists('last_refresh_date', $in)) {
        $sets[] = "last_refresh_date = ?";
        $vals[] = parcours_field_date($in, 'last_refresh_date');
    }

    if ($sets) {
        $vals[] = $id;
        db()->prepare("UPDATE parcours SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
    }
    parcours_detail($user_id, $id);
}

function parcours_delete(int $user_id, int $id): void
{
    if (!parcours_owned($user_id, $id)) res_error('Not found', 404);

    // Bild ggf. mitlöschen
    $stmt = db()->prepare('SELECT image_path FROM parcours WHERE id = ?');
    $stmt->execute([$id]);
    $img = $stmt->fetchColumn();
    if ($img) {
        $abs = parcours_upload_root() . '/' . basename((string)$img);
        if (is_file($abs)) @unlink($abs);
    }

    db()->prepare('DELETE FROM parcours WHERE id = ?')->execute([$id]);
    res_json(['ok' => true]);
}

function parcours_image_upload(int $user_id, int $id): void
{
    if (!parcours_owned($user_id, $id)) res_error('Not found', 404);

    if (!isset($_FILES['file'])) res_error('Keine Datei übertragen');
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) res_error('Upload-Fehler: ' . $f['error']);
    if ($f['size'] > MAX_UPLOAD_BYTES) res_error('Datei zu groß (max 5 MB)');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($f['tmp_name']) ?: '';
    if (!in_array($mime, ALLOWED_MIME, true)) {
        res_error('Nur JPEG, PNG oder WebP erlaubt');
    }

    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    };

    // Bild ggf. resizen + Re-Encoding zur Sicherheit (max 1600px breit)
    $img = parcours_imagecreate($f['tmp_name'], $mime);
    if (!$img) res_error('Bild konnte nicht verarbeitet werden');
    $img = parcours_imageresize($img, 1600);

    $upload_root = parcours_upload_root();
    if (!is_dir($upload_root) && !@mkdir($upload_root, 0755, true)) {
        res_error('Upload-Verzeichnis nicht beschreibbar', 500);
    }

    $filename = sprintf('p%d_%s.%s', $id, bin2hex(random_bytes(6)), $ext);
    $abs = $upload_root . '/' . $filename;

    $ok = match ($ext) {
        'jpg'  => imagejpeg($img, $abs, 85),
        'png'  => imagepng($img, $abs, 6),
        'webp' => imagewebp($img, $abs, 85),
    };
    imagedestroy($img);
    if (!$ok) res_error('Bild speichern fehlgeschlagen', 500);

    // Altes Bild löschen
    $stmt = db()->prepare('SELECT image_path FROM parcours WHERE id = ?');
    $stmt->execute([$id]);
    $old = $stmt->fetchColumn();
    if ($old) {
        $old_abs = $upload_root . '/' . basename((string)$old);
        if (is_file($old_abs) && $old_abs !== $abs) @unlink($old_abs);
    }

    db()->prepare('UPDATE parcours SET image_path = ? WHERE id = ?')->execute([
        UPLOAD_DIR_REL . '/' . $filename,
        $id,
    ]);

    res_json([
        'ok' => true,
        'image_url' => parcours_image_url(UPLOAD_DIR_REL . '/' . $filename),
    ]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parcours_owned(int $user_id, int $id): bool
{
    $s = db()->prepare('SELECT 1 FROM parcours WHERE id = ? AND user_id = ?');
    $s->execute([$id, $user_id]);
    return (bool)$s->fetchColumn();
}

function parcours_upload_root(): string
{
    return realpath(__DIR__ . '/../..') . UPLOAD_DIR_REL;
}

function parcours_image_url(?string $path): ?string
{
    if (!$path) return null;
    // Public URL ist absolute aus Sicht der Domain
    return $path;
}

function parcours_serialize(array $row): array
{
    // Reviews-Aggregat (avg + count) ergänzen
    require_once __DIR__ . '/parcours_reviews.php';
    $agg = reviews_aggregate((int)$row['id']);

    // Anzahl Bahnen, für die der Owner Detail-Datensätze (parcours_lanes-Tabelle)
    // angelegt hat — unabhängig von lanes_count (= Gesamt-Soll).
    $stmt = db()->prepare('SELECT COUNT(*) FROM parcours_lanes WHERE parcours_id = ?');
    $stmt->execute([(int)$row['id']]);
    $lanes_detailed = (int)$stmt->fetchColumn();

    return [
        'id'                => (int)$row['id'],
        'user_id'           => (int)$row['user_id'],
        'name'              => $row['name'],
        'description'       => $row['description'],
        'address'           => $row['address'],
        'lat'               => $row['lat'] !== null ? (float)$row['lat'] : null,
        'lng'               => $row['lng'] !== null ? (float)$row['lng'] : null,
        'image_path'        => $row['image_path'],
        'image_url'         => parcours_image_url($row['image_path']),
        'is_public'         => (bool)$row['is_public'],
        'lanes_count'       => isset($row['lanes_count']) && $row['lanes_count'] !== null ? (int)$row['lanes_count'] : null,
        'lanes_detailed_count' => $lanes_detailed,
        'price_info'        => $row['price_info']        ?? null,
        'opening_hours'     => $row['opening_hours']     ?? null,
        'website'           => $row['website']           ?? null,
        'contact_email'     => $row['contact_email']     ?? null,
        'contact_phone'     => $row['contact_phone']     ?? null,
        'difficulty'        => isset($row['difficulty']) && $row['difficulty'] !== null ? (int)$row['difficulty'] : null,
        'terrain'           => $row['terrain']           ?? null,
        'peg_blue'          => (bool)($row['peg_blue']   ?? 0),
        'peg_red'           => (bool)($row['peg_red']    ?? 0),
        'peg_yellow'        => (bool)($row['peg_yellow'] ?? 0),
        'peg_white'         => (bool)($row['peg_white']  ?? 0),
        'duration_min'      => isset($row['duration_min']) && $row['duration_min'] !== null ? (int)$row['duration_min'] : null,
        'season_note'       => $row['season_note']       ?? null,
        'access_note'       => $row['access_note']       ?? null,
        'last_refresh_date' => $row['last_refresh_date'] ?? null,
        'created_at'        => $row['created_at'],
        'updated_at'        => $row['updated_at'],
        'review_count'      => $agg['review_count'],
        'avg_rating'        => $agg['avg_rating'],
        // Ersteller-Info (nur gesetzt wenn SQL den JOIN auf users mitgeliefert hat)
        'user_display_name' => $row['user_display_name'] ?? null,
        'user_avatar_url'   => isset($row['user_avatar_path']) && $row['user_avatar_path'] ? (string)$row['user_avatar_path'] : null,
    ];
}

/**
 * Clone: kopiert Stammdaten + Bahnen eines (eigenen oder öffentlichen) Parcours
 * in einen neuen Parcours des aktuellen Users. Bilder werden NICHT mitkopiert
 * (sonst doppelter Speicherplatz; User soll bewusst eigene Fotos hochladen).
 */
function parcours_clone(int $user_id, int $source_id): void
{
    $s = db()->prepare(
        'SELECT * FROM parcours WHERE id = ? AND (user_id = ? OR is_public = 1)'
    );
    $s->execute([$source_id, $user_id]);
    $src = $s->fetch();
    if (!$src) res_error('Not found', 404);

    $in = req_json();
    $new_name = trim((string)($in['name'] ?? '')) ?: ($src['name'] . ' (Kopie)');

    db()->beginTransaction();
    try {
        $stmt = db()->prepare(
            'INSERT INTO parcours
                (user_id, name, description, address, lat, lng, is_public,
                 lanes_count, price_info, opening_hours, website, contact_email, contact_phone,
                 difficulty, terrain, peg_blue, peg_red, peg_yellow, peg_white,
                 duration_min, season_note, access_note, last_refresh_date)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $user_id,
            $new_name,
            $src['description'],
            $src['address'],
            $src['lat'],
            $src['lng'],
            $src['lanes_count'],
            $src['price_info'],
            $src['opening_hours'],
            $src['website'],
            $src['contact_email'],
            $src['contact_phone'],
            $src['difficulty'],
            $src['terrain'],
            $src['peg_blue'],
            $src['peg_red'],
            $src['peg_yellow'],
            $src['peg_white'],
            $src['duration_min'],
            $src['season_note'],
            $src['access_note'],
            $src['last_refresh_date'],
        ]);
        $new_id = (int)db()->lastInsertId();

        // Bahnen kopieren (ohne image_path — neue User können eigene Fotos machen)
        $lanes_stmt = db()->prepare('SELECT * FROM parcours_lanes WHERE parcours_id = ? ORDER BY sort_order, lane_number');
        $lanes_stmt->execute([$source_id]);
        $insert_lane = db()->prepare(
            'INSERT INTO parcours_lanes
                (parcours_id, lane_number, animal_description,
                 distance_blue, distance_red, distance_yellow, distance_white,
                 notes, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($lanes_stmt->fetchAll() as $lane) {
            $insert_lane->execute([
                $new_id,
                $lane['lane_number'],
                $lane['animal_description'],
                $lane['distance_blue'],
                $lane['distance_red'],
                $lane['distance_yellow'],
                $lane['distance_white'],
                $lane['notes'],
                $lane['sort_order'],
            ]);
        }

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    parcours_detail($user_id, $new_id, 201);
}

// ─── Helper für Create/Update — nullable Felder normalisieren ─────────────────

function parcours_field_string(array $in, string $key): ?string
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    return (string)$in[$key];
}

function parcours_field_float(array $in, string $key): ?float
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    return (float)$in[$key];
}

function parcours_field_int(array $in, string $key): ?int
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    return (int)$in[$key];
}

function parcours_field_difficulty(array $in): ?int
{
    if (!isset($in['difficulty']) || $in['difficulty'] === null || $in['difficulty'] === '') return null;
    $v = (int)$in['difficulty'];
    return ($v >= 1 && $v <= 5) ? $v : null;
}

function parcours_field_date(array $in, string $key): ?string
{
    if (!isset($in[$key]) || $in[$key] === null || $in[$key] === '') return null;
    $ts = strtotime((string)$in[$key]);
    return $ts === false ? null : date('Y-m-d', $ts);
}

function parcours_imagecreate(string $path, string $mime)
{
    if (!function_exists('imagecreatefromjpeg')) return false;
    return match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($path),
        'image/png'  => @imagecreatefrompng($path),
        'image/webp' => @imagecreatefromwebp($path),
        default      => false,
    };
}

function parcours_imageresize($img, int $max_width)
{
    $w = imagesx($img);
    $h = imagesy($img);
    if ($w <= $max_width) return $img;
    $new_w = $max_width;
    $new_h = (int)round($h * ($max_width / $w));
    $dst = imagecreatetruecolor($new_w, $new_h);
    imagecopyresampled($dst, $img, 0, 0, 0, 0, $new_w, $new_h, $w, $h);
    imagedestroy($img);
    return $dst;
}
