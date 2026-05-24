<?php
declare(strict_types=1);

require_once __DIR__ . '/Mailer.php';

/**
 * Sendet eine HTML-Mail an alle aktiven Superadmins.
 * Robust: Failures werden geloggt, nicht weitergeworfen (Mail soll nie eine
 * Auth-Anfrage blocken).
 */
function notify_superadmins(string $subject, string $htmlBody, ?string $altBody = null): void
{
    try {
        $stmt = db()->prepare(
            "SELECT email FROM users
             WHERE role = 'superadmin' AND status = 'active' AND deleted_at IS NULL"
        );
        $stmt->execute();
        $emails = array_map(fn($r) => (string)$r['email'], $stmt->fetchAll());
        foreach ($emails as $email) {
            try {
                send_mail($email, $subject, $htmlBody, $altBody);
            } catch (Throwable $e) {
                error_log('[admin_notify] send to ' . $email . ' failed: ' . $e->getMessage());
            }
        }
    } catch (Throwable $e) {
        error_log('[admin_notify] db lookup failed: ' . $e->getMessage());
    }
}

/**
 * Standard-Wrapper für „Neuer User registriert".
 */
function notify_admin_new_registration(int $user_id, string $email, ?string $display_name): void
{
    $name = $display_name ?: $email;
    $subject = '[Archerries Admin] Neuer User registriert: ' . $name;
    $html =
        '<p>Neue Registrierung auf <b>Archerries</b>:</p>'
      . '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">ID</td>'
      .       '<td style="padding:4px 0;font-family:monospace;">#' . (int)$user_id . '</td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td>'
      .       '<td style="padding:4px 0;">' . htmlspecialchars($display_name ?? '—', ENT_QUOTES, 'UTF-8') . '</td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">E-Mail</td>'
      .       '<td style="padding:4px 0;"><a href="mailto:' . htmlspecialchars($email) . '">' . htmlspecialchars($email) . '</a></td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">Zeitpunkt</td>'
      .       '<td style="padding:4px 0;">' . date('d.m.Y H:i') . '</td></tr>'
      . '</table>'
      . '<p style="margin-top:16px;">'
      . '<a href="' . htmlspecialchars(rtrim((string)config()['app_url'], '/')) . '/admin/users/' . (int)$user_id . '">→ Profil im Admin-Bereich öffnen</a>'
      . '</p>'
      . '<p style="color:#888;font-size:12px;margin-top:24px;">'
      . 'Diese Mail wird an alle aktiven Superadmins gesendet.'
      . '</p>';
    notify_superadmins($subject, $html);
}

/**
 * Standard-Wrapper für „User hat sich eingeloggt".
 */
function notify_admin_login(int $user_id, string $email, ?string $display_name, ?string $client_ip = null): void
{
    $name = $display_name ?: $email;
    $subject = '[Archerries Admin] Login: ' . $name;
    $html =
        '<p>Login auf <b>Archerries</b>:</p>'
      . '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">ID</td>'
      .       '<td style="padding:4px 0;font-family:monospace;">#' . (int)$user_id . '</td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td>'
      .       '<td style="padding:4px 0;">' . htmlspecialchars($display_name ?? '—', ENT_QUOTES, 'UTF-8') . '</td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">E-Mail</td>'
      .       '<td style="padding:4px 0;"><a href="mailto:' . htmlspecialchars($email) . '">' . htmlspecialchars($email) . '</a></td></tr>'
      .   '<tr><td style="padding:4px 12px 4px 0;color:#666;">Zeitpunkt</td>'
      .       '<td style="padding:4px 0;">' . date('d.m.Y H:i') . '</td></tr>'
      .   ($client_ip
            ? '<tr><td style="padding:4px 12px 4px 0;color:#666;">IP</td>'
            . '<td style="padding:4px 0;font-family:monospace;">' . htmlspecialchars($client_ip) . '</td></tr>'
            : '')
      . '</table>'
      . '<p style="margin-top:16px;">'
      . '<a href="' . htmlspecialchars(rtrim((string)config()['app_url'], '/')) . '/admin/users/' . (int)$user_id . '">→ Profil im Admin-Bereich öffnen</a>'
      . '</p>'
      . '<p style="color:#888;font-size:12px;margin-top:24px;">'
      . 'Diese Mail wird an alle aktiven Superadmins gesendet bei jedem erfolgreichen Login.'
      . '</p>';
    notify_superadmins($subject, $html);
}

/**
 * Liest die Client-IP aus üblichen Server-Variablen, inkl. Proxy-Header.
 */
function client_ip_from_request(): ?string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $val = (string)$_SERVER[$key];
            // X-Forwarded-For kann eine Liste sein — nimm den ersten Eintrag
            if (str_contains($val, ',')) $val = trim(explode(',', $val)[0]);
            return $val;
        }
    }
    return null;
}
