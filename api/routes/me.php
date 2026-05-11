<?php
declare(strict_types=1);

function handle_me(string $method): void
{
    if ($method !== 'GET') res_error('Method not allowed', 405);

    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);

    $stmt = db()->prepare('SELECT id, email, display_name, status FROM users WHERE id = ?');
    $stmt->execute([(int)$claims['uid']]);
    $u = $stmt->fetch();
    if (!$u) res_error('Unauthorized', 401);

    res_json([
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
    ]);
}
