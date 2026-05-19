<?php
declare(strict_types=1);

require_once __DIR__ . '/Jwt.php';

const NOTIF_CATEGORIES = ['social', 'invitations'];
const NOTIF_CHANNELS   = ['email', 'in_app'];

/** Default: enabled. Nur explizite Opt-Outs sind in der DB. */
function should_notify(int $user_id, string $category, string $channel): bool
{
    if (!in_array($category, NOTIF_CATEGORIES, true)) return true;
    if (!in_array($channel,  NOTIF_CHANNELS,   true)) return true;
    $s = db()->prepare(
        'SELECT enabled FROM notification_prefs
         WHERE user_id = ? AND category = ? AND channel = ? LIMIT 1'
    );
    $s->execute([$user_id, $category, $channel]);
    $row = $s->fetch();
    return $row === false ? true : (bool)(int)$row['enabled'];
}

/** Liefert alle Prefs als Map [category][channel] = bool. Defaults werden gefüllt. */
function notification_prefs_for(int $user_id): array
{
    $s = db()->prepare(
        'SELECT category, channel, enabled FROM notification_prefs WHERE user_id = ?'
    );
    $s->execute([$user_id]);
    $out = [];
    foreach (NOTIF_CATEGORIES as $cat) {
        foreach (NOTIF_CHANNELS as $ch) {
            $out[$cat][$ch] = true;
        }
    }
    foreach ($s->fetchAll() as $row) {
        $out[$row['category']][$row['channel']] = (bool)(int)$row['enabled'];
    }
    return $out;
}

/** Bulk-Save. Akzeptiert [category][channel] = bool. Unbekannte Werte werden ignoriert. */
function set_notification_prefs(int $user_id, array $in): void
{
    $upsert = db()->prepare(
        'INSERT INTO notification_prefs (user_id, category, channel, enabled)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)'
    );
    foreach ($in as $cat => $channels) {
        if (!in_array($cat, NOTIF_CATEGORIES, true) || !is_array($channels)) continue;
        foreach ($channels as $ch => $enabled) {
            if (!in_array($ch, NOTIF_CHANNELS, true)) continue;
            $upsert->execute([$user_id, $cat, $ch, $enabled ? 1 : 0]);
        }
    }
}

/** Signiertes 24h-Token für Auto-Login auf die Mail-Settings-Page. */
function mail_settings_token(int $user_id): string
{
    return jwt_sign(
        ['uid' => $user_id, 'purpose' => 'email_settings'],
        60 * 60 * 24
    );
}

/** Vollständige URL für Footer-Link in Mails. */
function mail_settings_url(int $user_id): string
{
    $base  = rtrim((string)config()['app_url'], '/');
    $token = mail_settings_token($user_id);
    return $base . '/email-settings?token=' . urlencode($token);
}

/**
 * DSGVO-konformer Mail-Footer mit Kategorie-Hinweis + Settings-Deep-Link.
 * Wird an alle nicht-Auth-Mails angehängt.
 */
function mail_footer_html(int $user_id, string $category_label): string
{
    $url = htmlspecialchars(mail_settings_url($user_id), ENT_QUOTES);
    $cat = htmlspecialchars($category_label, ENT_QUOTES);
    return '<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e5e5e5">'
         . '<p style="color:#888;font-size:12px;line-height:1.5;margin:0">'
         . 'Diese Mail erhältst du, weil <em>' . $cat . '</em> für dich aktiviert sind. '
         . '<a href="' . $url . '" style="color:#8E2C3A;text-decoration:underline">'
         . 'Benachrichtigungen verwalten</a>.'
         . '</p>';
}
