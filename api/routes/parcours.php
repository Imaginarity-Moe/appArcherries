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

    res_error('Not found', 404);
}

function parcours_list(int $user_id): void
{
    $include_public = req_query('include_public', '0') === '1';

    if ($include_public) {
        $stmt = db()->prepare(
            'SELECT * FROM parcours WHERE user_id = ? OR is_public = 1 ORDER BY name ASC'
        );
        $stmt->execute([$user_id]);
    } else {
        $stmt = db()->prepare('SELECT * FROM parcours WHERE user_id = ? ORDER BY name ASC');
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
        'INSERT INTO parcours (user_id, name, description, address, lat, lng, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $user_id,
        $name,
        isset($in['description']) ? (string)$in['description'] : null,
        isset($in['address'])     ? (string)$in['address']     : null,
        isset($in['lat'])         ? (float)$in['lat']          : null,
        isset($in['lng'])         ? (float)$in['lng']          : null,
        !empty($in['is_public']) ? 1 : 0,
    ]);
    $id = (int)db()->lastInsertId();
    parcours_detail($user_id, $id, 201);
}

function parcours_detail(int $user_id, int $id, int $status = 200): void
{
    $stmt = db()->prepare(
        'SELECT * FROM parcours WHERE id = ? AND (user_id = ? OR is_public = 1)'
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
    foreach (['name', 'description', 'address'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] === null ? null : (string)$in[$f];
        }
    }
    foreach (['lat', 'lng'] as $f) {
        if (array_key_exists($f, $in)) {
            $sets[] = "$f = ?";
            $vals[] = $in[$f] === null ? null : (float)$in[$f];
        }
    }
    if (array_key_exists('is_public', $in)) {
        $sets[] = "is_public = ?";
        $vals[] = $in['is_public'] ? 1 : 0;
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
    return [
        'id'          => (int)$row['id'],
        'user_id'     => (int)$row['user_id'],
        'name'        => $row['name'],
        'description' => $row['description'],
        'address'     => $row['address'],
        'lat'         => $row['lat'] !== null ? (float)$row['lat'] : null,
        'lng'         => $row['lng'] !== null ? (float)$row['lng'] : null,
        'image_path'  => $row['image_path'],
        'image_url'   => parcours_image_url($row['image_path']),
        'is_public'   => (bool)$row['is_public'],
        'created_at'  => $row['created_at'],
        'updated_at'  => $row['updated_at'],
    ];
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
