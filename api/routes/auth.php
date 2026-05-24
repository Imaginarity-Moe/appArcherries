<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Mailer.php';
require_once __DIR__ . '/../lib/AdminNotify.php';

function handle_auth(string $method, string $path): void
{
    $action = substr($path, strlen('/auth/'));
    match (true) {
        $method === 'POST' && $action === 'register'        => auth_register(),
        $method === 'GET'  && $action === 'verify'          => auth_verify(),
        $method === 'POST' && $action === 'login'           => auth_login(),
        $method === 'POST' && $action === 'forgot-password' => auth_forgot(),
        $method === 'POST' && $action === 'reset-password'  => auth_reset(),
        $method === 'POST' && $action === 'email-settings'  => auth_email_settings(),
        default => res_error('Not found', 404),
    };
}

/**
 * Tauscht einen signed Mail-Settings-Token (purpose=email_settings, 24h)
 * gegen ein vollwertiges 30-Tage-JWT. Nutzbar als Magic-Login von Mail-Footer-Links.
 */
function auth_email_settings(): void
{
    $in    = req_json();
    $token = trim((string)($in['token'] ?? ''));
    if (!$token) res_error('Kein Token', 400);

    $claims = jwt_verify($token);
    if (!$claims || ($claims['purpose'] ?? '') !== 'email_settings' || empty($claims['uid'])) {
        res_error('Token ungültig oder abgelaufen', 400);
    }
    $user_id = (int)$claims['uid'];

    $stmt = db()->prepare(
        'SELECT id, email, display_name, status, role, avatar_path, pro_mode FROM users WHERE id = ?'
    );
    $stmt->execute([$user_id]);
    $u = $stmt->fetch();
    if (!$u)                           res_error('User nicht gefunden', 404);
    if ($u['status'] !== 'active')     res_error('Konto nicht aktiv', 403);

    $jwt = jwt_sign(['uid' => (int)$u['id'], 'role' => $u['role']]);
    res_json([
        'token' => $jwt,
        'user' => [
            'id'           => (int)$u['id'],
            'email'        => $u['email'],
            'display_name' => $u['display_name'],
            'status'       => $u['status'],
            'role'         => $u['role'],
            'avatar_url'   => isset($u['avatar_path']) && $u['avatar_path'] ? (string)$u['avatar_path'] : null,
            'pro_mode'     => (bool)($u['pro_mode'] ?? 0),
        ],
    ]);
}

function auth_register(): void
{
    $in    = req_json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    $pass  = (string)($in['password'] ?? '');
    $name  = trim((string)($in['display_name'] ?? '')) ?: null;

    if (!filter_var($email, FILTER_VALIDATE_EMAIL))   res_error('Ungültige E-Mail');
    if (strlen($pass) < 8)                            res_error('Passwort zu kurz (mind. 8 Zeichen)');

    $db   = db();
    $stmt = $db->prepare('SELECT id, status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing && $existing['status'] === 'active') {
        // Out-of-band: Antwort wie bei Erfolg → verhindert E-Mail-Enumeration
        res_json(['ok' => true]);
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

    if ($existing) {
        $db->prepare('UPDATE users SET password_hash = ?, display_name = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$hash, $name, $existing['id']]);
        $userId = (int)$existing['id'];
    } else {
        $db->prepare('INSERT INTO users (email, password_hash, display_name, status) VALUES (?, ?, ?, "pending")')
            ->execute([$email, $hash, $name]);
        $userId = (int)$db->lastInsertId();
    }

    $token = bin2hex(random_bytes(32));
    $db->prepare('INSERT INTO email_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))')
        ->execute([$userId, $token]);

    $verifyUrl = rtrim((string)config()['app_url'], '/') . '/verify?token=' . urlencode($token);
    $html = "<p>Hallo " . htmlspecialchars($name ?? '') . ",</p>"
          . "<p>bitte bestätige deine E-Mail-Adresse durch Klick auf folgenden Link:</p>"
          . "<p><a href=\"" . htmlspecialchars($verifyUrl) . "\">E-Mail bestätigen</a></p>"
          . "<p>Der Link ist 24 Stunden gültig.</p>";

    if (!send_mail($email, 'Archerries: E-Mail bestätigen', $html)) {
        res_error('Konnte Bestätigungs-Mail nicht senden', 500);
    }

    // Admin-Benachrichtigung — failsafe, blockiert die Registrierung nicht
    notify_admin_new_registration($userId, $email, $name);

    res_json(['ok' => true]);
}

function auth_verify(): void
{
    $token = req_query('token');
    if (!$token) res_error('Kein Token', 400);

    $db   = db();
    $stmt = $db->prepare(
        'SELECT t.id AS tid, t.user_id, t.expires_at, t.used_at
         FROM email_tokens t WHERE t.token = ?'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row)                                  res_error('Token ungültig', 400);
    if ($row['used_at'])                        res_error('Token bereits verwendet', 400);
    if (strtotime($row['expires_at']) < time()) res_error('Token abgelaufen', 400);

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE users SET status = "active", updated_at = NOW() WHERE id = ?')
            ->execute([$row['user_id']]);
        $db->prepare('UPDATE email_tokens SET used_at = NOW() WHERE id = ?')
            ->execute([$row['tid']]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    res_json(['ok' => true]);
}

function auth_login(): void
{
    $in    = req_json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    $pass  = (string)($in['password'] ?? '');

    if (!$email || !$pass) res_error('E-Mail und Passwort erforderlich', 400);

    $stmt = db()->prepare('SELECT id, email, password_hash, display_name, status, role, avatar_path, pro_mode FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();

    if (!$u || !password_verify($pass, $u['password_hash'])) {
        res_error('Login fehlgeschlagen', 401);
    }
    if ($u['status'] !== 'active') {
        res_error('Bitte E-Mail-Adresse zuerst bestätigen', 403);
    }

    // Admin-Benachrichtigung — wir wollen über jeden erfolgreichen Login informiert sein.
    // Failsafe: blockiert den Login nie. Eigenen Login (Superadmin) ausnehmen damit kein Spam.
    if ($u['role'] !== 'superadmin') {
        notify_admin_login((int)$u['id'], (string)$u['email'], $u['display_name'] ?? null, client_ip_from_request());
    }

    $token = jwt_sign(['uid' => (int)$u['id'], 'role' => $u['role']]);
    res_json([
        'token' => $token,
        'user' => [
            'id'           => (int)$u['id'],
            'email'        => $u['email'],
            'display_name' => $u['display_name'],
            'status'       => $u['status'],
            'role'         => $u['role'],
            'avatar_url'   => isset($u['avatar_path']) && $u['avatar_path'] ? (string)$u['avatar_path'] : null,
            'pro_mode'     => (bool)($u['pro_mode'] ?? 0),
        ],
    ]);
}

function auth_forgot(): void
{
    $in    = req_json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        res_json(['ok' => true]);
    }

    $db   = db();
    $stmt = $db->prepare('SELECT id, display_name FROM users WHERE email = ? AND status = "active"');
    $stmt->execute([$email]);
    $u = $stmt->fetch();

    if ($u) {
        $token = bin2hex(random_bytes(32));
        $db->prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR))')
            ->execute([$u['id'], $token]);

        $url = rtrim((string)config()['app_url'], '/') . '/reset-password?token=' . urlencode($token);
        $html = "<p>Hallo " . htmlspecialchars((string)$u['display_name']) . ",</p>"
              . "<p>klicke den folgenden Link, um dein Passwort zurückzusetzen (2 Stunden gültig):</p>"
              . "<p><a href=\"" . htmlspecialchars($url) . "\">Passwort zurücksetzen</a></p>";
        send_mail($email, 'Archerries: Passwort zurücksetzen', $html);
    }

    res_json(['ok' => true]);
}

function auth_reset(): void
{
    $in    = req_json();
    $token = (string)($in['token'] ?? '');
    $pass  = (string)($in['password'] ?? '');

    if (!$token)           res_error('Kein Token', 400);
    if (strlen($pass) < 8) res_error('Passwort zu kurz (mind. 8 Zeichen)', 400);

    $db   = db();
    $stmt = $db->prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ?');
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row)                                  res_error('Token ungültig', 400);
    if ($row['used_at'])                        res_error('Token bereits verwendet', 400);
    if (strtotime($row['expires_at']) < time()) res_error('Token abgelaufen', 400);

    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$hash, $row['user_id']]);
        $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?')
            ->execute([$row['id']]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    res_json(['ok' => true]);
}
