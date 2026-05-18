<?php
declare(strict_types=1);

/**
 * In-App-Notifications.
 *   GET    /notifications              → { unread_count, items }
 *   PATCH  /notifications/<id>         body { read: true }
 *   POST   /notifications/mark-all-read
 *   DELETE /notifications/<id>
 *
 * Spezifische `kind`-Werte werden zur Zeit erzeugt:
 *  - friend_request_received      payload { friendship_id, from_user_id, from_display_name, from_email }
 *  - friend_request_accepted      payload { friendship_id, by_user_id, by_display_name }
 *  - friend_request_rejected      payload { by_user_id, by_display_name }
 *  - training_friend_added        payload { training_id, by_user_id, by_display_name }
 */

function handle_notifications(string $method, string $path): void
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);
    $me = (int)$claims['uid'];

    if ($path === '/notifications') {
        if ($method !== 'GET') res_error('Method not allowed', 405);
        notif_list($me);
        return;
    }
    if ($path === '/notifications/mark-all-read') {
        if ($method !== 'POST') res_error('Method not allowed', 405);
        notif_mark_all_read($me);
        return;
    }
    if (preg_match('#^/notifications/(\d+)$#', $path, $m)) {
        $id = (int)$m[1];
        if ($method === 'PATCH')  { notif_mark_read($me, $id); return; }
        if ($method === 'DELETE') { notif_delete($me, $id);     return; }
        res_error('Method not allowed', 405);
    }
    res_error('Not found', 404);
}

function notif_list(int $me): void
{
    $limit  = max(1, min(100, (int)(req_query('limit', '30') ?? '30')));
    $stmt = db()->prepare(
        'SELECT id, kind, payload, read_at, created_at
         FROM notifications WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ?'
    );
    $stmt->bindValue(1, $me,    PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $items = array_map(function ($r) {
        return [
            'id'         => (int)$r['id'],
            'kind'       => $r['kind'],
            'payload'    => $r['payload'] ? json_decode((string)$r['payload'], true) : null,
            'read'       => $r['read_at'] !== null,
            'created_at' => $r['created_at'],
        ];
    }, $rows);

    $countStmt = db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL');
    $countStmt->execute([$me]);
    $unread = (int)$countStmt->fetchColumn();

    res_json(['unread_count' => $unread, 'items' => $items]);
}

function notif_mark_read(int $me, int $id): void
{
    db()->prepare('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL')
        ->execute([$id, $me]);
    notif_list($me);
}

function notif_mark_all_read(int $me): void
{
    db()->prepare('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL')->execute([$me]);
    notif_list($me);
}

function notif_delete(int $me, int $id): void
{
    db()->prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')->execute([$id, $me]);
    notif_list($me);
}

/**
 * Helper, der von anderen Routen (friends, trainings, …) genutzt wird,
 * um Notifications zu erzeugen.
 */
function notify_create(int $user_id, string $kind, array $payload = []): void
{
    db()->prepare('INSERT INTO notifications (user_id, kind, payload) VALUES (?, ?, ?)')
        ->execute([$user_id, $kind, json_encode($payload, JSON_UNESCAPED_UNICODE)]);
}
