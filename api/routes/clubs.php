<?php
declare(strict_types=1);

/**
 * Verein-Anbindung (MVP).
 *
 *  GET    /clubs                              → meine Clubs (member-of)
 *  POST   /clubs                              → Club anlegen (Creator = admin)
 *  GET    /clubs/<id>                         → Detail + Mitgliederliste
 *  PATCH  /clubs/<id>                         → name/description (nur admin)
 *  DELETE /clubs/<id>                         → Club löschen (nur admin)
 *  POST   /clubs/join              body {invite_code}  → beitreten
 *  DELETE /clubs/<id>/members/me              → austreten
 *  DELETE /clubs/<id>/members/<uid>           → entfernen (nur admin, nicht sich selbst)
 *  POST   /clubs/<id>/regenerate-code         → neuer invite_code (nur admin)
 */
function handle_clubs(string $method, string $path): void
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) res_error('Unauthorized', 401);
    $me = (int)$claims['uid'];

    if ($path === '/clubs') {
        if ($method === 'GET')  { clubs_list_mine($me); return; }
        if ($method === 'POST') { clubs_create($me); return; }
        res_error('Method not allowed', 405);
    }
    if ($path === '/clubs/join') {
        if ($method !== 'POST') res_error('Method not allowed', 405);
        clubs_join($me);
        return;
    }
    if (preg_match('#^/clubs/(\d+)$#', $path, $m)) {
        $cid = (int)$m[1];
        if ($method === 'GET')    { clubs_detail($me, $cid); return; }
        if ($method === 'PATCH')  { clubs_update($me, $cid); return; }
        if ($method === 'DELETE') { clubs_delete($me, $cid); return; }
        res_error('Method not allowed', 405);
    }
    if (preg_match('#^/clubs/(\d+)/members/me$#', $path, $m)) {
        $cid = (int)$m[1];
        if ($method !== 'DELETE') res_error('Method not allowed', 405);
        clubs_leave($me, $cid);
        return;
    }
    if (preg_match('#^/clubs/(\d+)/members/(\d+)$#', $path, $m)) {
        $cid = (int)$m[1]; $target = (int)$m[2];
        if ($method !== 'DELETE') res_error('Method not allowed', 405);
        clubs_remove_member($me, $cid, $target);
        return;
    }
    if (preg_match('#^/clubs/(\d+)/regenerate-code$#', $path, $m)) {
        $cid = (int)$m[1];
        if ($method !== 'POST') res_error('Method not allowed', 405);
        clubs_regen_code($me, $cid);
        return;
    }
    res_error('Not found', 404);
}

// ─── Liste / Detail ───────────────────────────────────────────────────────

function clubs_list_mine(int $me): void
{
    $stmt = db()->prepare(
        'SELECT c.id, c.name, c.slug, c.description, c.invite_code, c.created_by, c.created_at,
                cm.role AS my_role,
                (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) AS member_count
         FROM clubs c
         JOIN club_members cm ON cm.club_id = c.id AND cm.user_id = ?
         ORDER BY c.name ASC'
    );
    $stmt->execute([$me]);
    $clubs = array_map(fn($r) => club_serialize($r, true), $stmt->fetchAll());
    res_json(['clubs' => $clubs]);
}

function clubs_detail(int $me, int $cid): void
{
    $role = club_member_role($cid, $me);
    if ($role === null) res_error('Not found', 404);

    $cs = db()->prepare(
        'SELECT id, name, slug, description, invite_code, created_by, created_at
         FROM clubs WHERE id = ?'
    );
    $cs->execute([$cid]);
    $club = $cs->fetch();
    if (!$club) res_error('Not found', 404);
    $club['my_role'] = $role;
    $club['member_count'] = clubs_member_count($cid);

    $ms = db()->prepare(
        'SELECT cm.user_id, cm.role, cm.joined_at,
                u.display_name, u.avatar_path, u.last_seen_at
         FROM club_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.club_id = ? AND u.deleted_at IS NULL
         ORDER BY (cm.role = "admin") DESC, cm.joined_at ASC'
    );
    $ms->execute([$cid]);
    $members = array_map(fn($r) => [
        'user_id'       => (int)$r['user_id'],
        'role'          => (string)$r['role'],
        'joined_at'     => (string)$r['joined_at'],
        'display_name'  => $r['display_name'],
        'avatar_url'    => $r['avatar_path'] ?: null,
        'last_seen_at'  => $r['last_seen_at'],
    ], $ms->fetchAll());

    res_json([
        'club'    => club_serialize($club, true),
        'members' => $members,
    ]);
}

// ─── Mutations ────────────────────────────────────────────────────────────

function clubs_create(int $me): void
{
    $in = req_json();
    $name = trim((string)($in['name'] ?? ''));
    if ($name === '') res_error('name erforderlich');
    if (mb_strlen($name) > 120) res_error('name zu lang (max 120)');
    $description = isset($in['description']) && $in['description'] !== ''
        ? (string)$in['description'] : null;

    $slug = clubs_unique_slug($name);
    $code = clubs_unique_invite_code();

    db()->beginTransaction();
    try {
        $stmt = db()->prepare(
            'INSERT INTO clubs (name, slug, description, invite_code, created_by)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $slug, $description, $code, $me]);
        $cid = (int)db()->lastInsertId();

        db()->prepare(
            'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, "admin")'
        )->execute([$cid, $me]);

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    clubs_detail($me, $cid);
}

function clubs_update(int $me, int $cid): void
{
    if (club_member_role($cid, $me) !== 'admin') res_error('Nur Admins können den Verein bearbeiten', 403);
    $in = req_json();
    $sets = []; $vals = [];
    if (array_key_exists('name', $in)) {
        $n = trim((string)$in['name']);
        if ($n === '') res_error('name darf nicht leer sein');
        if (mb_strlen($n) > 120) res_error('name zu lang');
        $sets[] = 'name = ?'; $vals[] = $n;
    }
    if (array_key_exists('description', $in)) {
        $d = $in['description'];
        $sets[] = 'description = ?';
        $vals[] = ($d === null || $d === '') ? null : (string)$d;
    }
    if ($sets) {
        $vals[] = $cid;
        db()->prepare('UPDATE clubs SET ' . implode(', ', $sets) . ' WHERE id = ?')
            ->execute($vals);
    }
    clubs_detail($me, $cid);
}

function clubs_delete(int $me, int $cid): void
{
    if (club_member_role($cid, $me) !== 'admin') res_error('Nur Admins können den Verein löschen', 403);
    db()->prepare('DELETE FROM clubs WHERE id = ?')->execute([$cid]);
    res_json(['ok' => true]);
}

function clubs_join(int $me): void
{
    $in = req_json();
    $code = strtoupper(trim((string)($in['invite_code'] ?? '')));
    if ($code === '') res_error('invite_code erforderlich');
    $stmt = db()->prepare('SELECT id FROM clubs WHERE invite_code = ?');
    $stmt->execute([$code]);
    $cid = (int)($stmt->fetchColumn() ?: 0);
    if ($cid === 0) res_error('Ungültiger Einladungs-Code', 404);

    // Bereits Mitglied?
    if (club_member_role($cid, $me) !== null) {
        clubs_detail($me, $cid);
        return;
    }
    db()->prepare(
        'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, "member")'
    )->execute([$cid, $me]);
    clubs_detail($me, $cid);
}

function clubs_leave(int $me, int $cid): void
{
    $my_role = club_member_role($cid, $me);
    if ($my_role === null) res_error('Du bist kein Mitglied', 404);

    // Wenn der letzte Admin austritt und es noch andere Members gibt → einen Member zum Admin promoten
    if ($my_role === 'admin') {
        $s = db()->prepare('SELECT COUNT(*) FROM club_members WHERE club_id = ? AND role = "admin"');
        $s->execute([$cid]);
        $admin_count = (int)$s->fetchColumn();
        if ($admin_count === 1) {
            // Promote oldest member
            $s = db()->prepare(
                'SELECT user_id FROM club_members
                 WHERE club_id = ? AND user_id != ?
                 ORDER BY joined_at ASC LIMIT 1'
            );
            $s->execute([$cid, $me]);
            $next_admin = (int)($s->fetchColumn() ?: 0);
            if ($next_admin > 0) {
                db()->prepare('UPDATE club_members SET role = "admin" WHERE club_id = ? AND user_id = ?')
                    ->execute([$cid, $next_admin]);
            }
        }
    }
    db()->prepare('DELETE FROM club_members WHERE club_id = ? AND user_id = ?')
        ->execute([$cid, $me]);

    // Wenn dadurch keine Mitglieder mehr da sind → Club löschen
    if (clubs_member_count($cid) === 0) {
        db()->prepare('DELETE FROM clubs WHERE id = ?')->execute([$cid]);
    }
    res_json(['ok' => true]);
}

function clubs_remove_member(int $me, int $cid, int $target): void
{
    if (club_member_role($cid, $me) !== 'admin') res_error('Nur Admins können Mitglieder entfernen', 403);
    if ($target === $me) res_error('Nutze /members/me um selbst auszutreten');
    db()->prepare('DELETE FROM club_members WHERE club_id = ? AND user_id = ?')
        ->execute([$cid, $target]);
    clubs_detail($me, $cid);
}

function clubs_regen_code(int $me, int $cid): void
{
    if (club_member_role($cid, $me) !== 'admin') res_error('Nur Admins können den Code rotieren', 403);
    $code = clubs_unique_invite_code();
    db()->prepare('UPDATE clubs SET invite_code = ? WHERE id = ?')->execute([$code, $cid]);
    clubs_detail($me, $cid);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function club_member_role(int $cid, int $uid): ?string
{
    $s = db()->prepare('SELECT role FROM club_members WHERE club_id = ? AND user_id = ?');
    $s->execute([$cid, $uid]);
    $r = $s->fetchColumn();
    return $r === false ? null : (string)$r;
}

function clubs_member_count(int $cid): int
{
    $s = db()->prepare('SELECT COUNT(*) FROM club_members WHERE club_id = ?');
    $s->execute([$cid]);
    return (int)$s->fetchColumn();
}

function clubs_unique_slug(string $name): string
{
    $base = preg_replace('/[^a-z0-9]+/i', '-', strtolower($name));
    $base = trim((string)$base, '-');
    if ($base === '') $base = 'club';
    if (strlen($base) > 70) $base = substr($base, 0, 70);

    $slug = $base;
    $n = 0;
    while (true) {
        $s = db()->prepare('SELECT 1 FROM clubs WHERE slug = ?');
        $s->execute([$slug]);
        if (!$s->fetchColumn()) return $slug;
        $n++;
        $slug = $base . '-' . $n;
        if ($n > 9999) {
            $slug = $base . '-' . bin2hex(random_bytes(3));
            return $slug;
        }
    }
}

function clubs_unique_invite_code(): string
{
    // 8 Zeichen ohne verwechselbare 0/O/I/1
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($i = 0; $i < 12; $i++) {
        $code = '';
        for ($j = 0; $j < 8; $j++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $s = db()->prepare('SELECT 1 FROM clubs WHERE invite_code = ?');
        $s->execute([$code]);
        if (!$s->fetchColumn()) return $code;
    }
    // Extrem unwahrscheinlich, aber Fallback
    return strtoupper(bin2hex(random_bytes(4)));
}

function club_serialize(array $r, bool $include_member_count): array
{
    $out = [
        'id'          => (int)$r['id'],
        'name'        => (string)$r['name'],
        'slug'        => (string)$r['slug'],
        'description' => $r['description'],
        'invite_code' => (string)$r['invite_code'],
        'created_by'  => (int)$r['created_by'],
        'created_at'  => (string)$r['created_at'],
    ];
    if (isset($r['my_role'])) $out['my_role'] = (string)$r['my_role'];
    if ($include_member_count && isset($r['member_count'])) {
        $out['member_count'] = (int)$r['member_count'];
    }
    return $out;
}
