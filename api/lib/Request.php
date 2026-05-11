<?php
declare(strict_types=1);

function req_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function req_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    // /api-Präfix abschneiden, falls vorhanden (Vite-Proxy bzw. Live-Pfad)
    $uri = preg_replace('#^/api#', '', $uri) ?? '/';
    if ($uri === '' || $uri === false) $uri = '/';
    return $uri;
}

/** @return array<string,mixed> */
function req_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function req_query(string $key, ?string $default = null): ?string
{
    return isset($_GET[$key]) ? (string)$_GET[$key] : $default;
}
