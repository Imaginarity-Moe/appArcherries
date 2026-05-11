<?php
declare(strict_types=1);

use Archerries\Jwt;
use Archerries\Response;

function handle_me(string $method): void
{
    if ($method !== 'GET') Response::error('Method not allowed', 405);

    $claims = Jwt::fromAuthHeader();
    if (!$claims || empty($claims['uid'])) Response::error('Unauthorized', 401);

    $stmt = db()->prepare('SELECT id, email, display_name, status FROM users WHERE id = ?');
    $stmt->execute([(int)$claims['uid']]);
    $u = $stmt->fetch();
    if (!$u) Response::error('Unauthorized', 401);

    Response::json([
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
    ]);
}
