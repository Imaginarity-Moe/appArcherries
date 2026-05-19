<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Mailer.php';
require_once __DIR__ . '/../lib/Notifications.php';
require_once __DIR__ . '/notifications.php';

/**
 * Freundschafts-System.
 * Endpoints:
 *   GET    /friends                 → { friends, incoming, outgoing, blocked }
 *   POST   /friends/requests        body { email } — sendet Anfrage + Email
 *   PATCH  /friends/<id>            body { action: accept|reject|block }, Email an Requester
 *   DELETE /friends/<id>            unfriend (oder eigene pending zurückziehen)
 */

function handle_friends(string $method, string $path): void
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);
    $me = (int)$claims['uid'];

    if ($path === '/friends') {
        if ($method !== 'GET') res_error('Method not allowed', 405);
        friends_list($me);
        return;
    }
    if ($path === '/friends/requests') {
        if ($method !== 'POST') res_error('Method not allowed', 405);
        friends_request($me);
        return;
    }
    if (preg_match('#^/friends/(\d+)$#', $path, $m)) {
        $id = (int)$m[1];
        if ($method === 'PATCH')  { friends_respond($me, $id); return; }
        if ($method === 'DELETE') { friends_delete($me, $id);  return; }
        res_error('Method not allowed', 405);
    }
    res_error('Not found', 404);
}

function friends_list(int $me): void
{
    $sql = '
        SELECT f.id, f.requester_id, f.recipient_id, f.status, f.requested_at, f.responded_at,
               u.id AS other_id, u.email AS other_email, u.display_name AS other_display_name, u.avatar_path AS other_avatar
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END
        WHERE f.requester_id = ? OR f.recipient_id = ?
        ORDER BY f.requested_at DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute([$me, $me, $me]);
    $rows = $stmt->fetchAll();

    $friends = [];
    $incoming = [];
    $outgoing = [];
    $blocked = [];

    foreach ($rows as $r) {
        $other = [
            'id'           => (int)$r['other_id'],
            'email'        => $r['other_email'],
            'display_name' => $r['other_display_name'],
            'avatar_url'   => $r['other_avatar'] ? (string)$r['other_avatar'] : null,
        ];
        $item = [
            'id'           => (int)$r['id'],
            'status'       => $r['status'],
            'requested_at' => $r['requested_at'],
            'responded_at' => $r['responded_at'],
            'user'         => $other,
            'i_am'         => ((int)$r['requester_id'] === $me) ? 'requester' : 'recipient',
        ];
        if ($r['status'] === 'accepted') {
            $friends[] = $item;
        } elseif ($r['status'] === 'pending') {
            if ($item['i_am'] === 'recipient') $incoming[] = $item;
            else                                $outgoing[] = $item;
        } elseif ($r['status'] === 'blocked') {
            // Nur die Blockierungen, die ICH ausgesprochen habe (ich = recipient bei block).
            if ($item['i_am'] === 'recipient') $blocked[] = $item;
        }
    }

    res_json([
        'friends'  => $friends,
        'incoming' => $incoming,
        'outgoing' => $outgoing,
        'blocked'  => $blocked,
    ]);
}

function friends_request(int $me): void
{
    $in    = req_json();
    $email = trim(strtolower((string)($in['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) res_error('Ungültige E-Mail');

    // User suchen
    $s = db()->prepare('SELECT id, display_name, email FROM users WHERE email = ? AND status = "active"');
    $s->execute([$email]);
    $target = $s->fetch();
    if (!$target) res_error('Kein User mit dieser E-Mail gefunden', 404);

    $target_id = (int)$target['id'];
    if ($target_id === $me) res_error('Du kannst dich nicht selbst anfragen', 400);

    // Existierende Beziehung in BEIDE Richtungen prüfen
    $s = db()->prepare(
        'SELECT id, requester_id, recipient_id, status FROM friendships
         WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
         LIMIT 1'
    );
    $s->execute([$me, $target_id, $target_id, $me]);
    if ($existing = $s->fetch()) {
        if ($existing['status'] === 'accepted') res_error('Ihr seid bereits Freunde', 409);
        if ($existing['status'] === 'pending')  res_error('Anfrage existiert bereits', 409);
        if ($existing['status'] === 'blocked') {
            // Wer hat wen blockiert?
            //  - status='blocked' wird gesetzt vom Recipient
            //  - Wenn der Recipient = target_id, dann hat target MICH blockiert
            //  - Wenn der Recipient = me, dann habe ich target blockiert
            if ((int)$existing['recipient_id'] === $target_id) {
                res_error(sprintf(
                    '%s möchte keine weiteren Anfragen von dir empfangen.',
                    $target['display_name'] ?? $target['email']
                ), 403);
            } else {
                res_error('Du hast diesen User blockiert. Hebe die Blockierung erst auf.', 403);
            }
        }
    }

    db()->prepare('INSERT INTO friendships (requester_id, recipient_id, status) VALUES (?, ?, "pending")')
        ->execute([$me, $target_id]);
    $friendship_id = (int)db()->lastInsertId();

    // Notification-Email + In-App-Notif an Empfänger
    $me_row = friend_user_row($me);
    notify_friend_request($target, $me_row);
    notify_create($target_id, 'friend_request_received', [
        'friendship_id'     => $friendship_id,
        'from_user_id'      => $me,
        'from_display_name' => $me_row['display_name'],
        'from_email'        => $me_row['email'],
    ]);

    friends_list($me);
}

function friends_respond(int $me, int $id): void
{
    $in     = req_json();
    $action = (string)($in['action'] ?? '');
    if (!in_array($action, ['accept', 'reject', 'block'], true)) res_error('Ungültige action');

    $s = db()->prepare('SELECT id, requester_id, recipient_id, status FROM friendships WHERE id = ?');
    $s->execute([$id]);
    $f = $s->fetch();
    if (!$f) res_error('Not found', 404);

    // Nur Recipient darf antworten, und nur auf pending
    if ((int)$f['recipient_id'] !== $me) res_error('Forbidden', 403);
    if ($f['status'] !== 'pending')     res_error('Anfrage ist nicht offen', 409);

    $me_row        = friend_user_row($me);
    $requester_row = friend_user_row((int)$f['requester_id']);

    if ($action === 'reject') {
        db()->prepare('DELETE FROM friendships WHERE id = ?')->execute([$id]);
        notify_friend_response($requester_row, $me_row, 'rejected');
        notify_create((int)$f['requester_id'], 'friend_request_rejected', [
            'by_user_id'      => $me,
            'by_display_name' => $me_row['display_name'],
        ]);
    } elseif ($action === 'accept') {
        db()->prepare('UPDATE friendships SET status = "accepted", responded_at = NOW() WHERE id = ?')
            ->execute([$id]);
        notify_friend_response($requester_row, $me_row, 'accepted');
        notify_create((int)$f['requester_id'], 'friend_request_accepted', [
            'friendship_id'   => $id,
            'by_user_id'      => $me,
            'by_display_name' => $me_row['display_name'],
        ]);
    } else { // block
        // Block: Row bleibt mit status='blocked' damit Re-Anfrage abgewiesen werden kann.
        // KEINE Email an Anfrager (er soll nicht wissen, dass er blockiert ist).
        db()->prepare('UPDATE friendships SET status = "blocked", responded_at = NOW() WHERE id = ?')
            ->execute([$id]);
    }

    friends_list($me);
}

function friends_delete(int $me, int $id): void
{
    $s = db()->prepare('SELECT id, requester_id, recipient_id, status FROM friendships WHERE id = ?');
    $s->execute([$id]);
    $f = $s->fetch();
    if (!$f) res_error('Not found', 404);

    $is_party = ((int)$f['requester_id'] === $me) || ((int)$f['recipient_id'] === $me);
    if (!$is_party) res_error('Forbidden', 403);

    // Blockierungen löscht nur der Blockierende selbst (= recipient)
    if ($f['status'] === 'blocked' && (int)$f['recipient_id'] !== $me) {
        res_error('Forbidden', 403);
    }

    db()->prepare('DELETE FROM friendships WHERE id = ?')->execute([$id]);
    friends_list($me);
}

// ─── Notification-Helper ──────────────────────────────────────────────────────

function friend_user_row(int $user_id): array
{
    $s = db()->prepare('SELECT id, email, display_name FROM users WHERE id = ?');
    $s->execute([$user_id]);
    return $s->fetch() ?: ['id' => $user_id, 'email' => '', 'display_name' => null];
}

function notify_friend_request(array $target, array $requester): void
{
    if (!should_notify((int)$target['id'], 'social', 'email')) return;
    $base = rtrim((string)config()['app_url'], '/');
    $name_req    = $requester['display_name'] ?: $requester['email'];
    $name_target = $target['display_name'] ?: $target['email'];
    $html = "<p>Hallo " . htmlspecialchars($name_target) . ",</p>"
          . "<p><strong>" . htmlspecialchars($name_req) . "</strong> (" . htmlspecialchars($requester['email'])
          . ") möchte dein Freund in Archerries werden.</p>"
          . "<p><a href=\"$base/friends\">Anfrage in Archerries öffnen</a></p>"
          . "<p style=\"color:#888;font-size:12px\">Du kannst die Anfrage annehmen, ablehnen oder den Anfrager blockieren.</p>"
          . mail_footer_html((int)$target['id'], 'soziale Benachrichtigungen');
    @send_mail($target['email'], 'Archerries: Neue Freundes-Anfrage', $html);
}

function notify_friend_response(array $requester, array $responder, string $action): void
{
    if (!$requester['email']) return;
    if (!should_notify((int)$requester['id'], 'social', 'email')) return;
    $base = rtrim((string)config()['app_url'], '/');
    $name_res = $responder['display_name'] ?: $responder['email'];
    $name_req = $requester['display_name'] ?: $requester['email'];
    if ($action === 'accepted') {
        $subject = 'Archerries: Deine Freundes-Anfrage wurde angenommen';
        $html = "<p>Hallo " . htmlspecialchars($name_req) . ",</p>"
              . "<p>Gute Nachricht: <strong>" . htmlspecialchars($name_res) . "</strong> hat deine"
              . " Freundes-Anfrage angenommen. Ihr seid jetzt verbunden.</p>"
              . "<p><a href=\"$base/friends\">Freundes-Liste öffnen</a></p>";
    } else { // rejected
        $subject = 'Archerries: Deine Freundes-Anfrage wurde abgelehnt';
        $html = "<p>Hallo " . htmlspecialchars($name_req) . ",</p>"
              . "<p>Deine Freundes-Anfrage an <strong>" . htmlspecialchars($name_res)
              . "</strong> wurde abgelehnt.</p>"
              . "<p>Du kannst es später erneut versuchen.</p>";
    }
    $html .= mail_footer_html((int)$requester['id'], 'soziale Benachrichtigungen');
    @send_mail($requester['email'], $subject, $html);
}
