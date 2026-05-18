<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lib/Request.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Jwt.php';

// CORS (Vite-Proxy in vite.config.ts erspart das eigentlich,
// aber falls jemand direkt aufruft, sind die Header da)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Migrate-Secret');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (req_method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path   = req_path();
$method = req_method();

try {
    if (str_starts_with($path, '/auth/')) {
        require __DIR__ . '/routes/auth.php';
        handle_auth($method, $path);
    } elseif ($path === '/me' || str_starts_with($path, '/me/')) {
        require __DIR__ . '/routes/me.php';
        handle_me($method, $path);
    } elseif (str_starts_with($path, '/trainings')) {
        require __DIR__ . '/routes/trainings.php';
        handle_trainings($method, $path);
    } elseif (str_starts_with($path, '/parcours')) {
        require __DIR__ . '/routes/parcours.php';
        handle_parcours($method, $path);
    } elseif (str_starts_with($path, '/stats')) {
        require __DIR__ . '/routes/stats.php';
        handle_stats($method, $path);
    } elseif (str_starts_with($path, '/bows')) {
        require __DIR__ . '/routes/bows.php';
        handle_bows($method, $path);
    } elseif (str_starts_with($path, '/arrows')) {
        require __DIR__ . '/routes/arrows.php';
        handle_arrows($method, $path);
    } elseif (str_starts_with($path, '/favorites')) {
        require __DIR__ . '/routes/favorites.php';
        handle_favorites($method, $path);
    } elseif (str_starts_with($path, '/friends')) {
        require __DIR__ . '/routes/friends.php';
        handle_friends($method, $path);
    } elseif (str_starts_with($path, '/highscore')) {
        require __DIR__ . '/routes/highscore.php';
        handle_highscore($method, $path);
    } elseif (str_starts_with($path, '/join/')) {
        require __DIR__ . '/routes/join.php';
        handle_join($method, $path);
    } elseif ($path === '/health') {
        res_json(['ok' => true, 'time' => date('c')]);
    } else {
        res_error('Not found', 404);
    }
} catch (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    $msg = config()['app_env'] === 'production' ? 'Server error' : $e->getMessage();
    res_error($msg, 500);
}
