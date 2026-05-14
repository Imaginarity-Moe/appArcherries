<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

/**
 * User-Favoriten — Disziplinen, Parcours, Bow-Types als Schnellzugriff.
 *
 *  GET    /favorites                    → eigene Liste
 *  POST   /favorites { kind, ref }      → setzen (idempotent)
 *  DELETE /favorites?kind=&ref=         → entfernen
 *
 *  kind ∈ {'discipline','parcours','bow_type'}
 *  ref  = String-Identifier (z.B. '3d_ifaa', 'recurve' oder parcours.id als String)
 */
function handle_favorites(string $method, string $path): void
{
    $user = require_auth();
    $sub  = substr($path, strlen('/favorites'));

    if ($sub === '' || $sub === '/') {
        match ($method) {
            'GET'    => favorites_list($user['id']),
            'POST'   => favorites_upsert($user['id']),
            'DELETE' => favorites_delete($user['id']),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }
    res_error('Not found', 404);
}

const FAV_KINDS = ['discipline', 'parcours', 'bow_type'];

function favorites_list(int $user_id): void
{
    $s = db()->prepare(
        'SELECT id, kind, ref, created_at FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC'
    );
    $s->execute([$user_id]);
    $rows = array_map(function ($r) {
        return [
            'id'         => (int)$r['id'],
            'kind'       => $r['kind'],
            'ref'        => $r['ref'],
            'created_at' => $r['created_at'],
        ];
    }, $s->fetchAll());
    res_json(['favorites' => $rows]);
}

function favorites_upsert(int $user_id): void
{
    $in = req_json();
    $kind = (string)($in['kind'] ?? '');
    $ref  = trim((string)($in['ref'] ?? ''));
    if (!in_array($kind, FAV_KINDS, true)) res_error('Ungültiges kind');
    if ($ref === '' || mb_strlen($ref) > 64) res_error('Ungültige ref');

    db()->prepare(
        'INSERT IGNORE INTO user_favorites (user_id, kind, ref) VALUES (?, ?, ?)'
    )->execute([$user_id, $kind, $ref]);
    res_json(['ok' => true, 'kind' => $kind, 'ref' => $ref]);
}

function favorites_delete(int $user_id): void
{
    $kind = (string)req_query('kind', '');
    $ref  = (string)req_query('ref', '');
    if (!in_array($kind, FAV_KINDS, true)) res_error('Ungültiges kind');
    if ($ref === '') res_error('ref erforderlich');

    db()->prepare('DELETE FROM user_favorites WHERE user_id = ? AND kind = ? AND ref = ?')
        ->execute([$user_id, $kind, $ref]);
    res_json(['ok' => true]);
}
