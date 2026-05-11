<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

use Archerries\Request;
use Archerries\Response;

// CORS (Dev: Vite läuft auf 5173 — Vite-Proxy in vite.config.ts erspart das eigentlich,
// aber falls jemand direkt aufruft, sind die Header da)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Migrate-Secret');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (Request::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path   = Request::path();
$method = Request::method();

try {
    if (str_starts_with($path, '/auth/')) {
        require __DIR__ . '/routes/auth.php';
        handle_auth($method, $path);
    } elseif ($path === '/me') {
        require __DIR__ . '/routes/me.php';
        handle_me($method);
    } elseif ($path === '/health') {
        Response::json(['ok' => true, 'time' => date('c')]);
    } else {
        Response::error('Not found', 404);
    }
} catch (Throwable $e) {
    $cfg = require __DIR__ . '/config.php';
    error_log('[api] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    $msg = $cfg['app_env'] === 'production' ? 'Server error' : $e->getMessage();
    Response::error($msg, 500);
}
