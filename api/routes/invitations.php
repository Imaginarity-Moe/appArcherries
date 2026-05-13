<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/Auth.php';

/**
 * Owner erzeugt eine Einladung für ein Training.
 * Route: POST /trainings/<id>/invitations
 * Optional Body: { role: "scorer"|"viewer", expires_in_hours, max_uses }
 */
function invitations_create(int $user_id, int $training_id): void
{
    if (!user_is_training_owner($user_id, $training_id)) {
        res_error('Nur der Owner kann Einladungen erstellen', 403);
    }

    $in       = req_json();
    $role     = (string)($in['role'] ?? 'scorer');
    $maxUses  = isset($in['max_uses']) && $in['max_uses'] !== null ? (int)$in['max_uses'] : null;
    $hours    = isset($in['expires_in_hours']) && $in['expires_in_hours'] !== null ? (int)$in['expires_in_hours'] : 24;

    if (!in_array($role, ['scorer', 'viewer'], true)) res_error('Ungültige role');

    $token = bin2hex(random_bytes(16)); // 32 Hex-Zeichen
    $expires_at = $hours > 0 ? date('Y-m-d H:i:s', time() + $hours * 3600) : null;

    db()->prepare(
        'INSERT INTO training_invitations
         (training_id, token, role, expires_at, max_uses, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$training_id, $token, $role, $expires_at, $maxUses, $user_id]);

    res_json([
        'invitation' => [
            'token'      => $token,
            'role'       => $role,
            'expires_at' => $expires_at,
            'max_uses'   => $maxUses,
            'url'        => app_join_url($token),
        ],
    ], 201);
}

/** Liste aktiver Einladungen für ein Training (Owner-only). */
function invitations_list(int $user_id, int $training_id): void
{
    if (!user_is_training_owner($user_id, $training_id)) {
        res_error('Nur der Owner kann Einladungen sehen', 403);
    }

    $stmt = db()->prepare(
        'SELECT id, token, role, expires_at, max_uses, used_count, created_at
         FROM training_invitations
         WHERE training_id = ?
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR used_count < max_uses)
         ORDER BY created_at DESC'
    );
    $stmt->execute([$training_id]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id']         = (int)$r['id'];
        $r['used_count'] = (int)$r['used_count'];
        if ($r['max_uses'] !== null) $r['max_uses'] = (int)$r['max_uses'];
        $r['url'] = app_join_url($r['token']);
    }
    unset($r);

    res_json(['invitations' => $rows]);
}

/** Einladung widerrufen (Owner-only). */
function invitations_delete(int $user_id, int $training_id, int $invitation_id): void
{
    if (!user_is_training_owner($user_id, $training_id)) {
        res_error('Nur der Owner kann Einladungen löschen', 403);
    }
    db()->prepare('DELETE FROM training_invitations WHERE id = ? AND training_id = ?')
        ->execute([$invitation_id, $training_id]);
    res_json(['ok' => true]);
}

function user_is_training_owner(int $user_id, int $training_id): bool
{
    $s = db()->prepare('SELECT 1 FROM trainings WHERE id = ? AND user_id = ?');
    $s->execute([$training_id, $user_id]);
    return (bool)$s->fetchColumn();
}

function app_join_url(string $token): string
{
    $base = rtrim((string)config()['app_url'], '/');
    return "$base/join/$token";
}
