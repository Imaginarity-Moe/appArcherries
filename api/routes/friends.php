<?php
declare(strict_types=1);

/**
 * Freundschafts-System.
 * Endpoints:
 *   GET    /friends                 → { friends, incoming, outgoing, blocked }
 *   POST   /friends/requests        body { email } — sendet Anfrage
 *   PATCH  /friends/<id>            body { action: accept|reject|block }
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
    $s = db()->prepare('SELECT id FROM users WHERE email = ? AND status = "active"');
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
            // Wenn target mich blockiert hat (target=recipient mit status=blocked durch target),
            // dann ist requester_id im row = ich. Aber wir machen das egal: blocked = nicht
            // nochmal anfragbar.
            res_error('Verbindung nicht möglich', 403);
        }
    }

    db()->prepare('INSERT INTO friendships (requester_id, recipient_id, status) VALUES (?, ?, "pending")')
        ->execute([$me, $target_id]);

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

    if ($action === 'reject') {
        db()->prepare('DELETE FROM friendships WHERE id = ?')->execute([$id]);
    } elseif ($action === 'accept') {
        db()->prepare('UPDATE friendships SET status = "accepted", responded_at = NOW() WHERE id = ?')
            ->execute([$id]);
    } else { // block
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
