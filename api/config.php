<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Berlin');

/**
 * Mini-Env-Loader (kein vlucas/phpdotenv). Liest <repo>/.env zeilenweise
 * und legt die Werte in $_ENV + putenv() ab. Idempotent.
 */
function load_env(): void
{
    static $loaded = false;
    if ($loaded) return;

    $envFile = __DIR__ . '/../.env';
    if (!is_readable($envFile)) {
        $loaded = true;
        return;
    }

    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        // Optional umschließende Anführungszeichen entfernen
        if (strlen($value) >= 2
            && (($value[0] === '"' && substr($value, -1) === '"')
             || ($value[0] === "'" && substr($value, -1) === "'"))) {
            $value = substr($value, 1, -1);
        }
        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
    $loaded = true;
}

function env(string $key, ?string $default = null): ?string
{
    load_env();
    $v = $_ENV[$key] ?? getenv($key);
    return ($v === false || $v === null || $v === '') ? $default : (string)$v;
}

function config(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $cfg = [
        'app_env'         => env('APP_ENV', 'production'),
        'app_url'         => env('APP_URL', 'https://archerries.mossig.de'),
        'db' => [
            'host' => env('DB_HOST'),
            'port' => (int)(env('DB_PORT', '3306') ?? '3306'),
            'name' => env('DB_NAME'),
            'user' => env('DB_USER'),
            'pass' => env('DB_PASS'),
        ],
        'jwt_secret'     => env('JWT_SECRET'),
        'migrate_secret' => env('MIGRATE_SECRET'),
        'mail' => [
            'host'       => env('MAIL_HOST'),
            'port'       => (int)(env('MAIL_PORT', '587') ?? '587'),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username'   => env('MAIL_USERNAME'),
            'password'   => env('MAIL_PASSWORD'),
            'from_email' => env('MAIL_FROM_EMAIL'),
            'from_name'  => env('MAIL_FROM_NAME', 'Archerries'),
        ],
    ];
    return $cfg;
}
