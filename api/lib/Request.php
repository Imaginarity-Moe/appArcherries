<?php
declare(strict_types=1);

function req_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function req_path(): string
{
    // Auf IONOS Shared Hosting werden Apache-Rewrites für nicht-existente
    // /api/*-Pfade vom Reverse-Proxy abgefangen und auf /index.html gemappt.
    // Workaround: das Frontend ruft /api/index.php/<route> auf — dann ist
    // index.php eine echte Datei und Apache leitet die Subpath in PATH_INFO weiter.
    $pi = $_SERVER['PATH_INFO'] ?? '';
    if ($pi !== '') {
        return $pi;
    }

    // Fallback für direkte /api/<route>-Aufrufe (falls Rewrite doch greift).
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $uri = preg_replace('#^/api(/index\.php)?#', '', $uri) ?? '/';
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
