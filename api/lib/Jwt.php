<?php
declare(strict_types=1);

namespace Archerries;

use Firebase\JWT\JWT as FJwt;
use Firebase\JWT\Key;

final class Jwt
{
    public static function sign(array $claims, int $ttlSeconds = 86400 * 30): string
    {
        $cfg = require __DIR__ . '/../config.php';
        $now = time();
        $payload = array_merge($claims, [
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ]);
        return FJwt::encode($payload, $cfg['jwt_secret'], 'HS256');
    }

    public static function verify(string $token): ?array
    {
        $cfg = require __DIR__ . '/../config.php';
        try {
            $decoded = FJwt::decode($token, new Key($cfg['jwt_secret'], 'HS256'));
            return (array)$decoded;
        } catch (\Throwable) {
            return null;
        }
    }

    public static function fromAuthHeader(): ?array
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s+(.+)/i', $h, $m)) return null;
        return self::verify($m[1]);
    }
}
