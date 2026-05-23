<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Uploads.php';
require_once __DIR__ . '/../lib/Notifications.php';

const AVATARS_UPLOAD_DIR = '/uploads/avatars';
const AVATAR_MAX_BYTES   = 1 * 1024 * 1024; // 1 MB

function handle_me(string $method, string $path = '/me'): void
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);
    $user_id = (int)$claims['uid'];

    if ($path === '/me') {
        match ($method) {
            'GET'    => me_get($user_id),
            'PATCH'  => me_update($user_id),
            'DELETE' => me_delete($user_id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }
    if ($path === '/me/avatar') {
        match ($method) {
            'POST'   => me_avatar_upload($user_id),
            'DELETE' => me_avatar_delete($user_id),
            default  => res_error('Method not allowed', 405),
        };
        return;
    }
    if ($path === '/me/notification-prefs') {
        match ($method) {
            'GET' => me_notif_prefs_get($user_id),
            'PUT' => me_notif_prefs_put($user_id),
            default => res_error('Method not allowed', 405),
        };
        return;
    }
    if ($path === '/me/onboarding/complete' && $method === 'POST') {
        db()->prepare('UPDATE users SET onboarding_completed_at = NOW() WHERE id = ?')->execute([$user_id]);
        me_get($user_id);
        return;
    }
    if ($path === '/me/onboarding/reset' && $method === 'POST') {
        db()->prepare('UPDATE users SET onboarding_completed_at = NULL WHERE id = ?')->execute([$user_id]);
        me_get($user_id);
        return;
    }

    res_error('Not found', 404);
}

function me_notif_prefs_get(int $user_id): void
{
    res_json(['prefs' => notification_prefs_for($user_id)]);
}

function me_notif_prefs_put(int $user_id): void
{
    $in = req_json();
    $prefs = $in['prefs'] ?? null;
    if (!is_array($prefs)) res_error('Ungültige prefs');
    set_notification_prefs($user_id, $prefs);
    res_json(['prefs' => notification_prefs_for($user_id)]);
}

function me_get(int $user_id): void
{
    $stmt = db()->prepare(
        'SELECT id, email, display_name, status, role, avatar_path, pro_mode, onboarding_completed_at, last_seen_at FROM users WHERE id = ?'
    );
    $stmt->execute([$user_id]);
    $u = $stmt->fetch();
    if (!$u) res_error('Unauthorized', 401);
    res_json(me_serialize($u));
}

function me_update(int $user_id): void
{
    $in = req_json();
    $sets = [];
    $vals = [];
    if (array_key_exists('display_name', $in)) {
        $v = trim((string)$in['display_name']);
        if ($v === '' || mb_strlen($v) > 120) res_error('Ungültiger display_name');
        $sets[] = 'display_name = ?'; $vals[] = $v;
    }
    if (array_key_exists('pro_mode', $in)) {
        $sets[] = 'pro_mode = ?'; $vals[] = $in['pro_mode'] ? 1 : 0;
    }
    if (!$sets) {
        me_get($user_id);
        return;
    }
    $vals[] = $user_id;
    db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    me_get($user_id);
}

/**
 * Eigene Account-Löschung — Soft-Delete.
 * Bestätigt via Password (Body: { password }).
 *
 * Identisch zur Admin-Variante (admin_user_delete), aber für sich selbst:
 *  - Superadmin kann sich nicht selbst löschen (Lock-Out-Schutz)
 *  - Password muss korrekt sein
 *  - Anonymisierung: email, display_name, avatar_path, password_hash, status
 */
function me_delete(int $user_id): void
{
    $in = req_json();
    $password = (string)($in['password'] ?? '');
    if ($password === '') res_error('Password erforderlich');

    $stmt = db()->prepare('SELECT id, email, role, password_hash, avatar_path, deleted_at FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $u = $stmt->fetch();
    if (!$u) res_error('User nicht gefunden', 404);
    if (!empty($u['deleted_at'])) res_error('Account ist bereits gelöscht', 409);

    // Superadmin nicht selbst-löschbar — Lock-Out-Schutz
    if ($u['role'] === 'superadmin') {
        res_error('Superadmin-Account kann nicht selbst gelöscht werden. Lass dich erst von einem anderen Superadmin demoten.', 403);
    }

    if (empty($u['password_hash']) || !password_verify($password, $u['password_hash'])) {
        res_error('Falsches Passwort', 401);
    }

    // Avatar-Datei räumen
    if (!empty($u['avatar_path'])) {
        delete_upload_file((string)$u['avatar_path']);
    }

    // Anonymisierung — identisch zur Admin-Variante
    $deleted_email = sprintf('deleted-%d-%d@deleted.local', $user_id, time());
    $deleted_name  = sprintf('Gelöschter User #%d', $user_id);

    db()->prepare(
        'UPDATE users SET
            email = ?,
            display_name = ?,
            password_hash = NULL,
            avatar_path = NULL,
            status = "pending",
            deleted_at = NOW()
         WHERE id = ?'
    )->execute([$deleted_email, $deleted_name, $user_id]);

    res_json(['ok' => true, 'mode' => 'soft', 'deleted_user_id' => $user_id]);
}

function me_avatar_upload(int $user_id): void
{
    // Override-Max-Bytes-Check vorab — 1 MB
    if (isset($_FILES['file']) && $_FILES['file']['size'] > AVATAR_MAX_BYTES) {
        res_error('Avatar zu groß (max 1 MB)');
    }

    // Aktuelles Avatar-Bild merken zum späteren Löschen
    $stmt = db()->prepare('SELECT avatar_path FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $old = $stmt->fetchColumn();

    $rel = process_image_upload(AVATARS_UPLOAD_DIR, sprintf('u%d', $user_id));

    if ($old) delete_upload_file((string)$old);

    db()->prepare('UPDATE users SET avatar_path = ? WHERE id = ?')->execute([$rel, $user_id]);

    me_get($user_id);
}

function me_avatar_delete(int $user_id): void
{
    $stmt = db()->prepare('SELECT avatar_path FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $old = $stmt->fetchColumn();
    if ($old) delete_upload_file((string)$old);

    db()->prepare('UPDATE users SET avatar_path = NULL WHERE id = ?')->execute([$user_id]);
    me_get($user_id);
}

function me_serialize(array $u): array
{
    return [
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
        'role'         => $u['role'],
        'avatar_path'  => $u['avatar_path'] ?? null,
        'avatar_url'   => isset($u['avatar_path']) && $u['avatar_path'] ? (string)$u['avatar_path'] : null,
        'pro_mode'     => (bool)($u['pro_mode'] ?? 0),
        'onboarding_completed_at' => $u['onboarding_completed_at'] ?? null,
        'last_seen_at' => $u['last_seen_at'] ?? null,
    ];
}
