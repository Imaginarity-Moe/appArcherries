<?php
declare(strict_types=1);

namespace Archerries;

final class Request
{
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function path(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $uri = preg_replace('#^/api#', '', $uri) ?? '/';
        if ($uri === '' || $uri === false) $uri = '/';
        return $uri;
    }

    /** @return array<string,mixed> */
    public static function json(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        return isset($_GET[$key]) ? (string)$_GET[$key] : $default;
    }
}
