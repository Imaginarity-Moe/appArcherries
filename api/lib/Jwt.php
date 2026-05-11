<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';

const JWT_TTL = 60 * 60 * 24 * 30; // 30 Tage

function jwt_sign(array $payload, ?int $ttl = null): string
{
    $secret = (string)config()['jwt_secret'];
    if ($secret === '') throw new RuntimeException('JWT_SECRET nicht konfiguriert');

    $now = time();
    $payload = array_merge($payload, [
        'iat' => $now,
        'exp' => $now + ($ttl ?? JWT_TTL),
    ]);
    $header = b64url((string)json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body   = b64url((string)json_encode($payload));
    $sig    = b64url(hash_hmac('sha256', "$header.$body", $secret, true));
    return "$header.$body.$sig";
}

function jwt_verify(string $token): ?array
{
    $secret = (string)config()['jwt_secret'];
    $parts  = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;

    $expected = b64url(hash_hmac('sha256', "$header.$body", $secret, true));
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode(b64url_decode($body), true);
    if (!is_array($payload)) return null;
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;
    return $payload;
}

function jwt_from_auth_header(): ?array
{
    $h = $_SERVER['HTTP_AUTHORIZATION']
         ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
         ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $h, $m)) return null;
    return jwt_verify(trim($m[1]));
}

function b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string
{
    $pad = (4 - strlen($data) % 4) % 4;
    return (string)base64_decode(strtr($data, '-_', '+/') . str_repeat('=', $pad));
}
