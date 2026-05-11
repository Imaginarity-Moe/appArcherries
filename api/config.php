<?php
declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

Dotenv\Dotenv::createImmutable(__DIR__ . '/..', '.env')->safeLoad();

function env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($v === false || $v === null || $v === '') {
        return $default;
    }
    return (string)$v;
}

return [
    'app_env'         => env('APP_ENV', 'production'),
    'app_url'         => env('APP_URL', 'https://archerries.mossig.de'),
    'db' => [
        'host' => env('DB_HOST'),
        'port' => (int)(env('DB_PORT', '3306') ?? '3306'),
        'name' => env('DB_NAME'),
        'user' => env('DB_USER'),
        'pass' => env('DB_PASS'),
    ],
    'jwt_secret'      => env('JWT_SECRET'),
    'migrate_secret'  => env('MIGRATE_SECRET'),
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
