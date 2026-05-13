<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Jwt.php';

/**
 * Routen rund um den Einladungs-Beitritt:
 *   GET  /join/<token>   öffentliche Vorschau eines Trainings (kein Auth)
 *   POST /join/<token>   Beitritt — entweder als eingeloggter User oder als Gast
 *                        Body bei Gast: { display_name: "Klaus" }
 */
function handle_join(string $method, string $path): void
{
    if (!preg_match('#^/join/([a-f0-9]{32})$#', $path, $m)) {
        res_error('Ungültiger Einladungs-Link', 404);
    }
    $token = $m[1];

    match ($method) {
        'GET'  => join_preview($token),
        'POST' => join_accept($token),
        default => res_error('Method not allowed', 405),
    };
}

/** Anonyme Vorschau: zeigt minimal Training-Info ohne Owner-Daten. */
function join_preview(string $token): void
{
    $inv = lookup_invitation($token);
    $t = db()->prepare(
        'SELECT t.id, t.started_at, t.discipline, t.bow_type, t.location, u.display_name AS owner_name
         FROM trainings t LEFT JOIN users u ON u.id = t.user_id
         WHERE t.id = ?'
    );
    $t->execute([$inv['training_id']]);
    $training = $t->fetch();
    if (!$training) res_error('Training nicht gefunden', 404);
    $training['id'] = (int)$training['id'];

    res_json([
        'training'   => $training,
        'invitation' => [
            'role'       => $inv['role'],
            'expires_at' => $inv['expires_at'],
        ],
    ]);
}

/**
 * Beitritt durchführen.
 * - Wenn Authorization-Header mit gültigem JWT vorhanden → User wird als Participant eingetragen
 * - Sonst: Body muss display_name enthalten → neuer Guest-User wird angelegt + JWT zurückgegeben
 */
function join_accept(string $token): void
{
    $inv = lookup_invitation($token);

    // Auth optional
    $auth_user = try_auth();

    if ($auth_user) {
        $user_id = (int)$auth_user['id'];
        $jwt = null; // Client hat bereits Token
    } else {
        $in = req_json();
        $display_name = trim((string)($in['display_name'] ?? ''));
        if ($display_name === '') res_error('display_name erforderlich für Gast-Beitritt');
        if (mb_strlen($display_name) > 60) res_error('display_name zu lang (max 60)');

        // Gast-User anlegen: role=guest, password_hash=NULL, email synthetisch
        $email = 'guest+' . bin2hex(random_bytes(6)) . '@archerries.local';
        $stmt = db()->prepare(
            'INSERT INTO users (email, password_hash, display_name, status, role)
             VALUES (?, NULL, ?, "active", "guest")'
        );
        $stmt->execute([$email, $display_name]);
        $user_id = (int)db()->lastInsertId();
        $jwt = jwt_sign(['uid' => $user_id, 'email' => $email, 'role' => 'guest']);
    }

    // Participant anlegen (idempotent durch UNIQUE-Key)
    db()->prepare(
        'INSERT IGNORE INTO training_participants (training_id, user_id, role)
         VALUES (?, ?, ?)'
    )->execute([$inv['training_id'], $user_id, $inv['role']]);

    // used_count erhöhen wenn neu beigetreten
    if (db()->lastInsertId()) {
        db()->prepare('UPDATE training_invitations SET used_count = used_count + 1 WHERE id = ?')
            ->execute([$inv['id']]);
    }

    res_json([
        'ok'           => true,
        'training_id'  => (int)$inv['training_id'],
        'token'        => $jwt, // null wenn schon eingeloggt
    ]);
}

function lookup_invitation(string $token): array
{
    $stmt = db()->prepare(
        'SELECT id, training_id, role, expires_at, max_uses, used_count
         FROM training_invitations WHERE token = ?'
    );
    $stmt->execute([$token]);
    $inv = $stmt->fetch();
    if (!$inv) res_error('Einladung nicht gefunden oder abgelaufen', 404);
    if ($inv['expires_at'] !== null && strtotime((string)$inv['expires_at']) < time()) {
        res_error('Einladung abgelaufen', 410);
    }
    if ($inv['max_uses'] !== null && (int)$inv['used_count'] >= (int)$inv['max_uses']) {
        res_error('Einladung aufgebraucht', 410);
    }
    $inv['id']          = (int)$inv['id'];
    $inv['training_id'] = (int)$inv['training_id'];
    return $inv;
}
