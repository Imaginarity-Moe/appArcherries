<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

use Archerries\Request;
use Archerries\Response;

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    $cfg    = require __DIR__ . '/config.php';
    $given  = $_SERVER['HTTP_X_MIGRATE_SECRET'] ?? '';
    $secret = $cfg['migrate_secret'];
    if (!$secret || !hash_equals($secret, (string)$given)) {
        Response::error('Forbidden', 403);
    }
    if (Request::method() !== 'POST') {
        Response::error('Use POST', 405);
    }
}

function out(array $payload, bool $isCli, int $status = 200): void
{
    if ($isCli) {
        fwrite(STDOUT, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        exit($status >= 400 ? 1 : 0);
    }
    Response::json($payload, $status);
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

    $dir = __DIR__ . '/migrations';
    $files = glob($dir . '/*.sql') ?: [];
    sort($files, SORT_STRING);

    $run = [];
    foreach ($files as $path) {
        $name = basename($path);
        if (in_array($name, $applied, true)) continue;

        $sql = file_get_contents($path);
        if ($sql === false || trim($sql) === '') continue;

        $db->beginTransaction();
        try {
            // Mehrere Statements pro Datei erlauben (split an Semikolon-Zeilenende).
            foreach (split_sql($sql) as $stmt) {
                if (trim($stmt) === '') continue;
                $db->exec($stmt);
            }
            $db->prepare('INSERT INTO schema_migrations (filename) VALUES (?)')->execute([$name]);
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            out(['error' => "Migration $name failed: " . $e->getMessage(), 'applied' => $run], $isCli, 500);
        }
        $run[] = $name;
    }

    out(['ok' => true, 'applied' => $run, 'already' => $applied], $isCli);
} catch (Throwable $e) {
    out(['error' => $e->getMessage()], $isCli, 500);
}

function split_sql(string $sql): array
{
    // Naive split: trennt an ';' am Zeilenende. Reicht für unsere Schema-Migrationen
    // (keine Stored Procedures / DELIMITER-Wechsel).
    $parts = preg_split('/;\s*\R/', $sql);
    return $parts === false ? [$sql] : $parts;
}
