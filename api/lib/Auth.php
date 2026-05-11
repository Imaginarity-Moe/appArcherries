<?php
declare(strict_types=1);

/**
 * Holt den eingeloggten User aus dem JWT oder bricht mit 401 ab.
 *
 * @return array{id:int, email:string, display_name:?string, status:string, role:string}
 */
function require_auth(): array
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) {
        res_error('Unauthorized', 401);
    }

    $stmt = db()->prepare('SELECT id, email, display_name, status, role FROM users WHERE id = ?');
    $stmt->execute([(int)$claims['uid']]);
    $u = $stmt->fetch();
    if (!$u || $u['status'] !== 'active') {
        res_error('Unauthorized', 401);
    }
    return [
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
        'role'         => $u['role'],
    ];
}
