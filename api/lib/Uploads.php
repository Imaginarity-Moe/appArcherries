<?php
declare(strict_types=1);

/**
 * Geteiltes Bild-Upload-Pattern (GD-Resize + Re-Encoding) für Parcours, Stations, ggf. weitere.
 * MIME-Whitelist + Max-Größe + Resize auf max 1600px.
 */

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_MAX_WIDTH = 1600;

/**
 * Verarbeitet ein hochgeladenes Bild aus $_FILES['file'] und speichert es als
 * resized JPEG/PNG/WebP unter $dir_rel/<prefix>_<rand>.<ext>.
 *
 * @return string Relativer Pfad ab DOCUMENT_ROOT, z.B. "/uploads/stations/s123_abcdef.jpg"
 */
function process_image_upload(string $dir_rel, string $prefix): string
{
    if (!isset($_FILES['file'])) res_error('Keine Datei übertragen');
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) res_error('Upload-Fehler: ' . $f['error']);
    if ($f['size'] > UPLOAD_MAX_BYTES) res_error('Datei zu groß (max 5 MB)');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($f['tmp_name']) ?: '';
    if (!in_array($mime, UPLOAD_ALLOWED_MIME, true)) {
        res_error('Nur JPEG, PNG oder WebP erlaubt');
    }

    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    };

    $img = upload_imagecreate($f['tmp_name'], $mime);
    if (!$img) res_error('Bild konnte nicht verarbeitet werden');
    $img = upload_imageresize($img, UPLOAD_MAX_WIDTH);

    $root = upload_root_for($dir_rel);
    if (!is_dir($root) && !@mkdir($root, 0755, true)) {
        res_error('Upload-Verzeichnis nicht beschreibbar', 500);
    }

    $filename = sprintf('%s_%s.%s', $prefix, bin2hex(random_bytes(6)), $ext);
    $abs      = $root . '/' . $filename;

    $ok = match ($ext) {
        'jpg'  => imagejpeg($img, $abs, 85),
        'png'  => imagepng($img, $abs, 6),
        'webp' => imagewebp($img, $abs, 85),
    };
    imagedestroy($img);
    if (!$ok) res_error('Bild speichern fehlgeschlagen', 500);

    return $dir_rel . '/' . $filename;
}

/** Löscht ein altes Upload-Bild basierend auf seinem relativen Pfad. */
function delete_upload_file(?string $rel_path): void
{
    if (!$rel_path) return;
    $abs = realpath(__DIR__ . '/../..') . $rel_path;
    if (is_file($abs)) @unlink($abs);
}

function upload_root_for(string $dir_rel): string
{
    return realpath(__DIR__ . '/../..') . $dir_rel;
}

function upload_imagecreate(string $path, string $mime)
{
    if (!function_exists('imagecreatefromjpeg')) return false;
    return match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($path),
        'image/png'  => @imagecreatefrompng($path),
        'image/webp' => @imagecreatefromwebp($path),
        default      => false,
    };
}

function upload_imageresize($img, int $max_width)
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
