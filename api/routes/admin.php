<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Uploads.php';

/**
 * Admin-Bereich. Rollen-Hierarchie:
 *  - superadmin > admin > user/guest
 *
 * Schutzregeln:
 *  - Nur superadmin und admin haben Zugriff
 *  - Ein superadmin kann nicht von einem normalen admin geändert/gelöscht werden
 *  - Ein superadmin kann sich nicht selbst demoten oder deaktivieren
 *  - Mindestens ein aktiver superadmin muss übrig bleiben (Lock-Out-Schutz)
 *  - Eigener Account (sowohl für superadmin als auch admin) ist nicht änderbar
 */
function handle_admin(string $method, string $path): void
{
    $me = require_auth();
    if (!in_array($me['role'], ['superadmin', 'admin'], true)) {
        res_error('Forbidden', 403);
    }

    // Admin-Bereich: Backend-Fehler explizit durchreichen (statt generisches "Server error")
    // damit Bug-Diagnose möglich ist. Nur Admins/Superadmins sehen das.
    try {
        if ($path === '/admin/users' && $method === 'GET') {
            admin_users_list();
            return;
        }
        if (preg_match('#^/admin/users/(\d+)$#', $path, $m)) {
            $uid = (int)$m[1];
            if ($method === 'GET')    { admin_user_detail($uid); return; }
            if ($method === 'PATCH')  { admin_user_update($me, $uid); return; }
            if ($method === 'DELETE') { admin_user_delete($me, $uid); return; }
        }
        if (preg_match('#^/admin/users/(\d+)/trainings$#', $path, $m) && $method === 'GET') {
            admin_user_trainings((int)$m[1]);
            return;
        }
    } catch (Throwable $e) {
        error_log('[admin] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
        res_error('Admin-Fehler: ' . $e->getMessage(), 500);
    }

    res_error('Not found', 404);
}

// ─── Liste ──────────────────────────────────────────────────────────────────

function admin_users_list(): void
{
    // ?include_deleted=1 zeigt auch soft-deleted User; Standard ist NUR aktive.
    $include_deleted = !empty($_GET['include_deleted']);
    $where = $include_deleted ? '' : 'WHERE u.deleted_at IS NULL';
    $sql = "
        SELECT
            u.id, u.email, u.display_name, u.status, u.role,
            u.avatar_path, u.created_at, u.last_seen_at, u.deleted_at,
            (SELECT COUNT(*) FROM trainings WHERE user_id = u.id) AS count_trainings,
            (SELECT COUNT(*) FROM parcours  WHERE user_id = u.id) AS count_parcours,
            (SELECT COUNT(*) FROM bows      WHERE user_id = u.id) AS count_bows
        FROM users u
        $where
        ORDER BY u.created_at DESC
    ";
    $rows = db()->query($sql)->fetchAll();
    $users = array_map('admin_user_summary', $rows);
    res_json(['users' => $users]);
}

function admin_user_summary(array $u): array
{
    return [
        'id'              => (int)$u['id'],
        'email'           => $u['email'],
        'display_name'    => $u['display_name'],
        'status'          => $u['status'],
        'role'            => $u['role'],
        'avatar_url'      => $u['avatar_path'] ?: null,
        'created_at'      => $u['created_at'],
        'last_seen_at'    => $u['last_seen_at'] ?? null,
        'deleted_at'      => $u['deleted_at'] ?? null,
        'count_trainings' => (int)($u['count_trainings'] ?? 0),
        'count_parcours'  => (int)($u['count_parcours']  ?? 0),
        'count_bows'      => (int)($u['count_bows']      ?? 0),
    ];
}

// ─── Detail ─────────────────────────────────────────────────────────────────

function admin_user_detail(int $target_uid): void
{
    $stmt = db()->prepare("
        SELECT u.id, u.email, u.display_name, u.status, u.role, u.avatar_path, u.created_at,
               u.onboarding_completed_at, u.last_seen_at, u.deleted_at,
               (SELECT COUNT(*) FROM trainings WHERE user_id = u.id) AS count_trainings,
               (SELECT COUNT(*) FROM parcours  WHERE user_id = u.id) AS count_parcours,
               (SELECT COUNT(*) FROM bows      WHERE user_id = u.id) AS count_bows,
               (SELECT COUNT(*) FROM arrows    WHERE user_id = u.id) AS count_arrows,
               (SELECT COUNT(*) FROM equipment_items WHERE user_id = u.id) AS count_equipment,
               (SELECT COUNT(*) FROM parcours_reviews WHERE user_id = u.id) AS count_reviews,
               (SELECT COUNT(*) FROM friendships WHERE (requester_id = u.id OR recipient_id = u.id) AND status = 'accepted') AS count_friends
        FROM users u
        WHERE u.id = ?
    ");
    $stmt->execute([$target_uid]);
    $u = $stmt->fetch();
    if (!$u) res_error('User nicht gefunden', 404);

    // Letzte 10 Trainings
    $stmt = db()->prepare("
        SELECT t.id, t.discipline, t.bow_type, t.started_at, t.ended_at, t.summary_score,
               t.published_to_highscore, p.name AS parcours_name
        FROM trainings t
        LEFT JOIN parcours p ON p.id = t.parcours_id
        WHERE t.user_id = ?
        ORDER BY t.started_at DESC
        LIMIT 10
    ");
    $stmt->execute([$target_uid]);
    $trainings = array_map(fn($r) => [
        'id'                     => (int)$r['id'],
        'discipline'             => $r['discipline'],
        'bow_type'               => $r['bow_type'],
        'started_at'             => $r['started_at'],
        'ended_at'               => $r['ended_at'],
        'summary_score'          => $r['summary_score'] !== null ? (int)$r['summary_score'] : null,
        'published_to_highscore' => (bool)$r['published_to_highscore'],
        'parcours_name'          => $r['parcours_name'],
    ], $stmt->fetchAll());

    // Parcours (alle)
    $stmt = db()->prepare("
        SELECT id, name, is_public, lanes_count, created_at,
               (SELECT COUNT(*) FROM parcours_reviews WHERE parcours_id = parcours.id) AS reviews_count
        FROM parcours
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$target_uid]);
    $parcours = array_map(fn($r) => [
        'id'            => (int)$r['id'],
        'name'          => $r['name'],
        'is_public'     => (bool)$r['is_public'],
        'lanes_count'   => $r['lanes_count'] !== null ? (int)$r['lanes_count'] : null,
        'reviews_count' => (int)$r['reviews_count'],
        'created_at'    => $r['created_at'],
    ], $stmt->fetchAll());

    // Bögen (alle)
    $stmt = db()->prepare("
        SELECT id, name, bow_type, draw_weight_lbs, is_default, image_path, created_at
        FROM bows WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
    ");
    $stmt->execute([$target_uid]);
    $bows = array_map(fn($r) => [
        'id'              => (int)$r['id'],
        'name'            => $r['name'],
        'bow_type'        => $r['bow_type'],
        'draw_weight_lbs' => $r['draw_weight_lbs'] !== null ? (float)$r['draw_weight_lbs'] : null,
        'is_default'      => (bool)$r['is_default'],
        'image_url'       => $r['image_path'] ?: null,
        'created_at'      => $r['created_at'],
    ], $stmt->fetchAll());

    // Pfeil-Sets
    $stmt = db()->prepare("
        SELECT id, name, manufacturer, model, spine, count_total, count_broken, count_lost, created_at
        FROM arrows WHERE user_id = ? ORDER BY created_at DESC
    ");
    $stmt->execute([$target_uid]);
    $arrows = array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'name'         => $r['name'],
        'manufacturer' => $r['manufacturer'],
        'model'        => $r['model'],
        'spine'        => $r['spine'],
        'count_total'  => $r['count_total'] !== null ? (int)$r['count_total'] : null,
        'count_broken' => (int)($r['count_broken'] ?? 0),
        'count_lost'   => (int)($r['count_lost']   ?? 0),
        'created_at'   => $r['created_at'],
    ], $stmt->fetchAll());

    // Equipment-Items
    $stmt = db()->prepare("
        SELECT id, kind, sub_kind, name, manufacturer, model, retired_at, created_at
        FROM equipment_items WHERE user_id = ? ORDER BY created_at DESC
    ");
    $stmt->execute([$target_uid]);
    $equipment = array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'kind'         => $r['kind'],
        'sub_kind'     => $r['sub_kind'],
        'name'         => $r['name'],
        'manufacturer' => $r['manufacturer'],
        'model'        => $r['model'],
        'retired_at'   => $r['retired_at'],
        'created_at'   => $r['created_at'],
    ], $stmt->fetchAll());

    // Freunde (akzeptierte) — beide Seiten der Friendship-Beziehung
    // ACHTUNG: PDO mit EMULATE_PREPARES=false erlaubt keine wiederholten Named-Params.
    // Native MySQL-Prepared-Statements verlangen pro Platzhalter eine separate Bindung.
    // Deshalb positional placeholders + $target_uid dreifach übergeben.
    $stmt = db()->prepare("
        SELECT u.id, u.email, u.display_name, u.avatar_path, u.last_seen_at
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.recipient_id ELSE f.requester_id END
        WHERE (f.requester_id = ? OR f.recipient_id = ?) AND f.status = 'accepted'
        ORDER BY u.display_name ASC, u.email ASC
    ");
    $stmt->execute([$target_uid, $target_uid, $target_uid]);
    $friends = array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'email'        => $r['email'],
        'display_name' => $r['display_name'],
        'avatar_url'   => $r['avatar_path'] ?: null,
        'last_seen_at' => $r['last_seen_at'] ?? null,
    ], $stmt->fetchAll());

    // Reviews (vom User geschrieben)
    $stmt = db()->prepare("
        SELECT r.id, r.parcours_id, r.rating, r.comment, r.created_at, p.name AS parcours_name
        FROM parcours_reviews r
        JOIN parcours p ON p.id = r.parcours_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    ");
    $stmt->execute([$target_uid]);
    $reviews = array_map(fn($r) => [
        'id'            => (int)$r['id'],
        'parcours_id'   => (int)$r['parcours_id'],
        'parcours_name' => $r['parcours_name'],
        'rating'        => (int)$r['rating'],
        'comment'       => $r['comment'],
        'created_at'    => $r['created_at'],
    ], $stmt->fetchAll());

    res_json([
        'user' => [
            'id'                     => (int)$u['id'],
            'email'                  => $u['email'],
            'display_name'           => $u['display_name'],
            'status'                 => $u['status'],
            'role'                   => $u['role'],
            'avatar_url'             => $u['avatar_path'] ?: null,
            'created_at'             => $u['created_at'],
            'onboarding_completed_at'=> $u['onboarding_completed_at'],
            'last_seen_at'           => $u['last_seen_at'] ?? null,
            'deleted_at'             => $u['deleted_at'] ?? null,
            'count_trainings'        => (int)$u['count_trainings'],
            'count_parcours'         => (int)$u['count_parcours'],
            'count_bows'             => (int)$u['count_bows'],
            'count_arrows'           => (int)$u['count_arrows'],
            'count_equipment'        => (int)$u['count_equipment'],
            'count_reviews'          => (int)$u['count_reviews'],
            'count_friends'          => (int)$u['count_friends'],
        ],
        'trainings' => $trainings,
        'parcours'  => $parcours,
        'bows'      => $bows,
        'arrows'    => $arrows,
        'equipment' => $equipment,
        'friends'   => $friends,
        'reviews'   => $reviews,
    ]);
}

// ─── Paginierte Trainings ─────────────────────────────────────────────────
//
// Detail-Endpoint liefert die ersten 10 als Vorschau (siehe admin_user_detail).
// Power-User mit 200+ Trainings können hier weitere Seiten nachladen.
//
// Query: ?offset=10&limit=20  (offset 0 = neueste, descending nach started_at)
function admin_user_trainings(int $target_uid): void
{
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));

    $total = (int)db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ?')
        ->execute([$target_uid]) ?: 0;
    $cstmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ?');
    $cstmt->execute([$target_uid]);
    $total = (int)$cstmt->fetchColumn();

    $stmt = db()->prepare("
        SELECT t.id, t.discipline, t.bow_type, t.started_at, t.ended_at, t.summary_score,
               t.published_to_highscore, p.name AS parcours_name
        FROM trainings t
        LEFT JOIN parcours p ON p.id = t.parcours_id
        WHERE t.user_id = ?
        ORDER BY t.started_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute([$target_uid]);
    $rows = array_map(fn($r) => [
        'id'                     => (int)$r['id'],
        'discipline'             => $r['discipline'],
        'bow_type'               => $r['bow_type'],
        'started_at'             => $r['started_at'],
        'ended_at'               => $r['ended_at'],
        'summary_score'          => $r['summary_score'] !== null ? (int)$r['summary_score'] : null,
        'published_to_highscore' => (bool)$r['published_to_highscore'],
        'parcours_name'          => $r['parcours_name'],
    ], $stmt->fetchAll());

    res_json([
        'trainings' => $rows,
        'offset'    => $offset,
        'limit'     => $limit,
        'total'     => $total,
        'has_more'  => $offset + count($rows) < $total,
    ]);
}

// ─── Schutz-Helper ──────────────────────────────────────────────────────────

function admin_can_modify(array $me, array $target): bool
{
    // Eigener Account ist nie änderbar (vorbeugung gegen Lock-Out)
    if ((int)$target['id'] === (int)$me['id']) return false;
    // Superadmin kann nur von superadmin angefasst werden
    if ($target['role'] === 'superadmin' && $me['role'] !== 'superadmin') return false;
    // Normaler admin kann andere admins nicht ändern (nur superadmin tut das)
    if ($target['role'] === 'admin' && $me['role'] !== 'superadmin') return false;
    return true;
}

function admin_ensure_superadmin_remains(int $excluding_id = 0): void
{
    $stmt = db()->prepare("
        SELECT COUNT(*) FROM users
        WHERE role = 'superadmin' AND status = 'active' AND id != ?
    ");
    $stmt->execute([$excluding_id]);
    $count = (int)$stmt->fetchColumn();
    if ($count < 1) {
        res_error('Es muss mindestens ein aktiver Superadmin übrig bleiben');
    }
}

// ─── Update ─────────────────────────────────────────────────────────────────

function admin_user_update(array $me, int $target_uid): void
{
    $in = req_json();

    $stmt = db()->prepare('SELECT id, role, status FROM users WHERE id = ?');
    $stmt->execute([$target_uid]);
    $target = $stmt->fetch();
    if (!$target) res_error('User nicht gefunden', 404);

    if (!admin_can_modify($me, $target)) {
        res_error('Du darfst diesen User nicht ändern', 403);
    }

    $sets = [];
    $vals = [];

    if (array_key_exists('role', $in)) {
        $new_role = (string)$in['role'];
        if (!in_array($new_role, ['superadmin', 'admin', 'user', 'guest'], true)) {
            res_error('Ungültige Rolle');
        }
        // Promotion zu superadmin nur durch superadmin selbst
        if ($new_role === 'superadmin' && $me['role'] !== 'superadmin') {
            res_error('Nur ein Superadmin kann jemanden zum Superadmin machen', 403);
        }
        // Wenn target schon superadmin ist und Demote: prüfen ob letzter
        if ($target['role'] === 'superadmin' && $new_role !== 'superadmin') {
            admin_ensure_superadmin_remains((int)$target['id']);
        }
        $sets[] = 'role = ?';
        $vals[] = $new_role;
    }

    if (array_key_exists('status', $in)) {
        $new_status = (string)$in['status'];
        if (!in_array($new_status, ['active', 'pending'], true)) {
            res_error('Ungültiger Status');
        }
        // Wenn target superadmin und auf pending: nur erlaubt wenn noch ein anderer da
        if ($target['role'] === 'superadmin' && $new_status !== 'active') {
            admin_ensure_superadmin_remains((int)$target['id']);
        }
        $sets[] = 'status = ?';
        $vals[] = $new_status;
    }

    if (!$sets) res_error('Nichts zu ändern');

    $vals[] = $target_uid;
    db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

    // Zusammenfassung zurückgeben
    $stmt = db()->prepare("
        SELECT u.id, u.email, u.display_name, u.status, u.role, u.avatar_path, u.created_at,
               (SELECT COUNT(*) FROM trainings WHERE user_id = u.id) AS count_trainings,
               (SELECT COUNT(*) FROM parcours  WHERE user_id = u.id) AS count_parcours,
               (SELECT COUNT(*) FROM bows      WHERE user_id = u.id) AS count_bows
        FROM users u WHERE u.id = ?
    ");
    $stmt->execute([$target_uid]);
    res_json(['user' => admin_user_summary($stmt->fetch())]);
}

// ─── Hard-Delete ────────────────────────────────────────────────────────────

function admin_user_delete(array $me, int $target_uid): void
{
    $in = req_json();
    $confirm_email = trim((string)($in['confirm_email'] ?? ''));

    $stmt = db()->prepare('SELECT id, email, role, avatar_path, deleted_at FROM users WHERE id = ?');
    $stmt->execute([$target_uid]);
    $target = $stmt->fetch();
    if (!$target) res_error('User nicht gefunden', 404);
    if (!empty($target['deleted_at'])) res_error('User ist bereits gelöscht', 409);

    if (!admin_can_modify($me, $target)) {
        res_error('Du darfst diesen User nicht löschen', 403);
    }

    if ($confirm_email !== $target['email']) {
        res_error('Email-Bestätigung stimmt nicht überein');
    }

    // Wenn target superadmin: hartes Verbot — Superadmin kann nicht gelöscht werden,
    // weil "Mindestens-ein-Superadmin"-Constraint sonst verletzt wäre.
    if ($target['role'] === 'superadmin') {
        admin_ensure_superadmin_remains((int)$target['id']);
    }

    // Avatar-Datei vom Server räumen falls vorhanden — auch bei Soft-Delete
    // tragen wir den Speicher ab.
    if (!empty($target['avatar_path'])) {
        delete_upload_file((string)$target['avatar_path']);
    }

    // ─── Soft-Delete: User anonymisieren, Inhalte erhalten ───────────────────
    // - display_name + email werden unbrauchbar (DSGVO: PII raus)
    // - email braucht weiterhin UNIQUE-Schlüssel-Stabilität, also zeit-suffix
    // - password_hash = NULL → kein Login mehr möglich (zusätzlich zu deleted_at-Check)
    // - avatar_path = NULL (Datei oben schon gelöscht)
    // - deleted_at = NOW() (Marker für alle Filter-Queries)
    //
    // Reviews, Friendships, geteilte Trainings, öffentliche Parcours BLEIBEN —
    // andere User sehen den Eintrag als "Gelöschter User" gerendert.
    $deleted_email = sprintf('deleted-%d-%d@deleted.local', $target_uid, time());
    $deleted_name  = sprintf('Gelöschter User #%d', $target_uid);

    db()->prepare(
        'UPDATE users SET
            email = ?,
            display_name = ?,
            password_hash = NULL,
            avatar_path = NULL,
            status = "pending",
            deleted_at = NOW()
         WHERE id = ?'
    )->execute([$deleted_email, $deleted_name, $target_uid]);

    res_json(['ok' => true, 'deleted_user_id' => $target_uid, 'mode' => 'soft']);
}
