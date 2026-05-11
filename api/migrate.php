<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lib/Request.php';
require_once __DIR__ . '/lib/Response.php';

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    $given  = $_SERVER['HTTP_X_MIGRATE_SECRET'] ?? '';
    $secret = (string)config()['migrate_secret'];
    if ($secret === '' || !hash_equals($secret, (string)$given)) {
        res_error('Forbidden', 403);
    }
    if (req_method() !== 'POST') {
        res_error('Use POST', 405);
    }
}

function migrate_out(array $payload, bool $isCli, int $status = 200): void
{
    if ($isCli) {
        fwrite(STDOUT, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        exit($status >= 400 ? 1 : 0);
    }
    res_json($payload, $status);
}

function split_sql(string $sql): array
{
    // Naive split an ';' am Zeilenende. Reicht für Schema-Migrationen
    // (keine Stored Procedures / DELIMITER-Wechsel).
    $parts = preg_split('/;\s*\R/', $sql);
    return $parts === false ? [$sql] : $parts;
}

try {
    $db = db();
    $db->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(191) NOT NULL UNIQUE,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $applied = array_column(
        $db->query('SELECT filename FROM schema_migrations')->fetchAll(),
        'filename'
    );

    $dir   = __DIR__ . '/migrations';
    $files = glob($dir . '/*.sql') ?: [];
    sort($files, SORT_STRING);

    $run = [];
    foreach ($files as $path) {
        $name = basename($path);
        if (in_array($name, $applied, true)) continue;

        $sql = file_get_contents($path);
        if ($sql === false || trim($sql) === '') continue;

        // Bewusst KEINE Transaktion: MySQL macht bei DDL (CREATE/ALTER/DROP TABLE)
        // ein implicit commit, dadurch wäre $db->commit() ein No-Op und $db->rollBack()
        // würde "There is no active transaction" werfen. Migrations sind durch
        // "CREATE TABLE IF NOT EXISTS" idempotent — Retry nach Teilausfall ist safe.
        try {
            foreach (split_sql($sql) as $stmt) {
                if (trim($stmt) === '') continue;
                $db->exec($stmt);
            }
            $db->prepare('INSERT INTO schema_migrations (filename) VALUES (?)')->execute([$name]);
        } catch (Throwable $e) {
            migrate_out(['error' => "Migration $name failed: " . $e->getMessage(), 'applied' => $run], $isCli, 500);
        }
        $run[] = $name;
    }

    migrate_out(['ok' => true, 'applied' => $run, 'already' => $applied], $isCli);
} catch (Throwable $e) {
    migrate_out(['error' => $e->getMessage()], $isCli, 500);
}
