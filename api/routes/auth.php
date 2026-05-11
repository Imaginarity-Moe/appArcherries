<?php
declare(strict_types=1);

use Archerries\Jwt;
use Archerries\Mailer;
use Archerries\Request;
use Archerries\Response;

function handle_auth(string $method, string $path): void
{
    $action = substr($path, strlen('/auth/'));
    match (true) {
        $method === 'POST' && $action === 'register'        => auth_register(),
        $method === 'GET'  && $action === 'verify'          => auth_verify(),
        $method === 'POST' && $action === 'login'           => auth_login(),
        $method === 'POST' && $action === 'forgot-password' => auth_forgot(),
        $method === 'POST' && $action === 'reset-password'  => auth_reset(),
        default => Response::error('Not found', 404),
    };
}

function auth_register(): void
{
    $in    = Request::json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    $pass  = (string)($in['password'] ?? '');
    $name  = trim((string)($in['display_name'] ?? '')) ?: null;

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Ungültige E-Mail');
    }
    if (strlen($pass) < 8) {
        Response::error('Passwort zu kurz (mind. 8 Zeichen)');
    }

    $db = db();
    $stmt = $db->prepare('SELECT id, status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing && $existing['status'] === 'active') {
        // Out-of-band: Antwort wie bei Erfolg, um Email-Enumeration zu verhindern
        Response::json(['ok' => true]);
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT);

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

    $cfg = require __DIR__ . '/../config.php';
    $verifyUrl = rtrim($cfg['app_url'], '/') . '/verify?token=' . urlencode($token);
    $html = "<p>Hallo " . htmlspecialchars($name ?? '') . ",</p>"
          . "<p>bitte bestätige deine E-Mail-Adresse durch Klick auf folgenden Link:</p>"
          . "<p><a href=\"" . htmlspecialchars($verifyUrl) . "\">E-Mail bestätigen</a></p>"
          . "<p>Der Link ist 24 Stunden gültig.</p>";

    try {
        Mailer::send($email, 'Archerries: E-Mail bestätigen', $html);
    } catch (Throwable $e) {
        error_log('[register] mail failed: ' . $e->getMessage());
        Response::error('Konnte Bestätigungs-Mail nicht senden', 500);
    }

    Response::json(['ok' => true]);
}

function auth_verify(): void
{
    $token = Request::query('token');
    if (!$token) Response::error('Kein Token', 400);

    $db = db();
    $stmt = $db->prepare(
        'SELECT t.id AS tid, t.user_id, t.expires_at, t.used_at
         FROM email_tokens t WHERE t.token = ?'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row)                     Response::error('Token ungültig', 400);
    if ($row['used_at'])           Response::error('Token bereits verwendet', 400);
    if (strtotime($row['expires_at']) < time()) Response::error('Token abgelaufen', 400);

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

    Response::json(['ok' => true]);
}

function auth_login(): void
{
    $in    = Request::json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    $pass  = (string)($in['password'] ?? '');

    if (!$email || !$pass) Response::error('E-Mail und Passwort erforderlich', 400);

    $db = db();
    $stmt = $db->prepare('SELECT id, email, password_hash, display_name, status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();

    if (!$u || !password_verify($pass, $u['password_hash'])) {
        Response::error('Login fehlgeschlagen', 401);
    }
    if ($u['status'] !== 'active') {
        Response::error('Bitte E-Mail-Adresse zuerst bestätigen', 403);
    }

    $token = Jwt::sign(['uid' => (int)$u['id']]);
    Response::json([
        'token' => $token,
        'user' => [
            'id'           => (int)$u['id'],
            'email'        => $u['email'],
            'display_name' => $u['display_name'],
            'status'       => $u['status'],
        ],
    ]);
}

function auth_forgot(): void
{
    $in    = Request::json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::json(['ok' => true]);
    }

    $db = db();
    $stmt = $db->prepare('SELECT id, display_name FROM users WHERE email = ? AND status = "active"');
    $stmt->execute([$email]);
    $u = $stmt->fetch();

    if ($u) {
        $token = bin2hex(random_bytes(32));
        $db->prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR))')
            ->execute([$u['id'], $token]);

        $cfg = require __DIR__ . '/../config.php';
        $url = rtrim($cfg['app_url'], '/') . '/reset-password?token=' . urlencode($token);
        $html = "<p>Hallo " . htmlspecialchars((string)$u['display_name']) . ",</p>"
              . "<p>klicke den folgenden Link, um dein Passwort zurückzusetzen (2 Stunden gültig):</p>"
              . "<p><a href=\"" . htmlspecialchars($url) . "\">Passwort zurücksetzen</a></p>";
        try { Mailer::send($email, 'Archerries: Passwort zurücksetzen', $html); }
        catch (Throwable $e) { error_log('[forgot] mail failed: ' . $e->getMessage()); }
    }

    Response::json(['ok' => true]);
}

function auth_reset(): void
{
    $in    = Request::json();
    $token = (string)($in['token'] ?? '');
    $pass  = (string)($in['password'] ?? '');

    if (!$token)          Response::error('Kein Token', 400);
    if (strlen($pass) < 8) Response::error('Passwort zu kurz (mind. 8 Zeichen)', 400);

    $db = db();
    $stmt = $db->prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = ?');
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row)                                       Response::error('Token ungültig', 400);
    if ($row['used_at'])                             Response::error('Token bereits verwendet', 400);
    if (strtotime($row['expires_at']) < time())      Response::error('Token abgelaufen', 400);

    $hash = password_hash($pass, PASSWORD_BCRYPT);

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

    Response::json(['ok' => true]);
}
