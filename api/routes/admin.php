<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

/**
 * Admin-Bereich: User-Verwaltung. Alle Endpunkte verlangen role=admin.
 * Schutzregeln:
 *  - Ein Admin kann sich nicht selbst demoten oder deaktivieren (sonst sperrt
 *    er sich aus seiner eigenen Konsole aus).
 *  - Es muss immer mindestens ein admin-User mit status='active' übrig bleiben.
 */
function handle_admin(string $method, string $path): void
{
    $me = require_auth();
    if ($me['role'] !== 'admin') res_error('Forbidden', 403);

    if ($path === '/admin/users' && $method === 'GET') {
        admin_users_list();
        return;
    }
    if (preg_match('#^/admin/users/(\d+)$#', $path, $m)) {
        $uid = (int)$m[1];
        if ($method === 'PATCH') {
            admin_user_update($me, $uid);
            return;
        }
    }

    res_error('Not found', 404);
}

function admin_users_list(): void
{
    // Aggregat-Joins in einem Statement statt N+1.
    $sql = "
        SELECT
            u.id, u.email, u.display_name, u.status, u.role,
            u.avatar_path, u.created_at,
            (SELECT COUNT(*) FROM trainings WHERE user_id = u.id) AS count_trainings,
            (SELECT COUNT(*) FROM parcours  WHERE user_id = u.id) AS count_parcours,
            (SELECT COUNT(*) FROM bows      WHERE user_id = u.id) AS count_bows
        FROM users u
        ORDER BY u.created_at DESC
    ";
    $rows = db()->query($sql)->fetchAll();
    $users = array_map(function ($u) {
        return [
            'id'              => (int)$u['id'],
            'email'           => $u['email'],
            'display_name'    => $u['display_name'],
            'status'          => $u['status'],
            'role'            => $u['role'],
            'avatar_url'      => $u['avatar_path'] ?: null,
            'created_at'      => $u['created_at'],
            'count_trainings' => (int)$u['count_trainings'],
            'count_parcours'  => (int)$u['count_parcours'],
            'count_bows'      => (int)$u['count_bows'],
        ];
    }, $rows);
    res_json(['users' => $users]);
}

function admin_user_update(array $me, int $target_uid): void
{
    $in = req_json();

    // Ziel-User laden
    $stmt = db()->prepare('SELECT id, role, status FROM users WHERE id = ?');
    $stmt->execute([$target_uid]);
    $target = $stmt->fetch();
    if (!$target) res_error('User nicht gefunden', 404);

    $sets = [];
    $vals = [];

    if (array_key_exists('role', $in)) {
        $new_role = (string)$in['role'];
        if (!in_array($new_role, ['admin', 'user', 'guest'], true)) {
            res_error('Ungültige Rolle');
        }
        // Self-Demote-Schutz
        if ($target_uid === $me['id'] && $new_role !== 'admin') {
            res_error('Du kannst deine eigene Admin-Rolle nicht ändern');
        }
        // Letzten-Admin-Schutz
        if ($target['role'] === 'admin' && $new_role !== 'admin') {
            $count = (int)db()->query("SELECT COUNT(*) FROM users WHERE role='admin' AND status='active'")->fetchColumn();
            if ($count <= 1) res_error('Es muss mindestens ein aktiver Admin übrig bleiben');
        }
        $sets[] = 'role = ?';
        $vals[] = $new_role;
    }

    if (array_key_exists('status', $in)) {
        $new_status = (string)$in['status'];
        if (!in_array($new_status, ['active', 'pending'], true)) {
            res_error('Ungültiger Status');
        }
        // Self-Deactivate-Schutz
        if ($target_uid === $me['id'] && $new_status !== 'active') {
            res_error('Du kannst deinen eigenen Status nicht ändern');
        }
        // Letzten-Admin-Schutz: wenn target ein admin ist und auf pending gesetzt wird
        if ($target['role'] === 'admin' && $new_status !== 'active') {
            $count = (int)db()->query("SELECT COUNT(*) FROM users WHERE role='admin' AND status='active'")->fetchColumn();
            if ($count <= 1) res_error('Es muss mindestens ein aktiver Admin übrig bleiben');
        }
        $sets[] = 'status = ?';
        $vals[] = $new_status;
    }

    if (!$sets) {
        res_error('Nichts zu ändern');
    }

    $vals[] = $target_uid;
    db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

    // Frisch laden und in Listenform zurückgeben
    $stmt = db()->prepare("
        SELECT
            u.id, u.email, u.display_name, u.status, u.role,
            u.avatar_path, u.created_at,
            (SELECT COUNT(*) FROM trainings WHERE user_id = u.id) AS count_trainings,
            (SELECT COUNT(*) FROM parcours  WHERE user_id = u.id) AS count_parcours,
            (SELECT COUNT(*) FROM bows      WHERE user_id = u.id) AS count_bows
        FROM users u
        WHERE u.id = ?
    ");
    $stmt->execute([$target_uid]);
    $u = $stmt->fetch();
    res_json([
        'user' => [
            'id'              => (int)$u['id'],
            'email'           => $u['email'],
            'display_name'    => $u['display_name'],
            'status'          => $u['status'],
            'role'            => $u['role'],
            'avatar_url'      => $u['avatar_path'] ?: null,
            'created_at'      => $u['created_at'],
            'count_trainings' => (int)$u['count_trainings'],
            'count_parcours'  => (int)$u['count_parcours'],
            'count_bows'      => (int)$u['count_bows'],
        ],
    ]);
}
