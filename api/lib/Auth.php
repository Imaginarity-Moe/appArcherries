<?php
declare(strict_types=1);

/**
 * Holt den eingeloggten User aus dem JWT oder bricht mit 401 ab.
 *
 * @return array{id:int, email:string, display_name:?string, status:string, role:string}
 */
function require_auth(): array
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) {
        res_error('Unauthorized', 401);
    }

    $stmt = db()->prepare('SELECT id, email, display_name, status, role, last_seen_at FROM users WHERE id = ?');
    $stmt->execute([(int)$claims['uid']]);
    $u = $stmt->fetch();
    if (!$u || $u['status'] !== 'active') {
        res_error('Unauthorized', 401);
    }

    // Throttled-Update von last_seen_at: nur alle 60s schreiben, damit wir
    // nicht bei jedem polling-Tick eine DB-Write provozieren.
    $last = $u['last_seen_at'] ? strtotime((string)$u['last_seen_at']) : 0;
    if (time() - $last >= 60) {
        try {
            db()->prepare('UPDATE users SET last_seen_at = NOW() WHERE id = ?')->execute([(int)$u['id']]);
        } catch (Throwable $e) {
            // last_seen_at-Updates dürfen nie eine echte Anfrage blockieren
        }
    }

    return [
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
        'role'         => $u['role'],
    ];
}

/**
 * Optionale Auth: gibt den User zurück wenn ein gültiges JWT vorhanden ist,
 * sonst null. Bricht nicht ab.
 *
 * @return array{id:int, email:string, display_name:?string, status:string, role:string}|null
 */
function try_auth(): ?array
{
    $claims = jwt_from_auth_header();
    if (!$claims || empty($claims['uid'])) return null;

    $stmt = db()->prepare('SELECT id, email, display_name, status, role FROM users WHERE id = ?');
    $stmt->execute([(int)$claims['uid']]);
    $u = $stmt->fetch();
    if (!$u || $u['status'] !== 'active') return null;
    return [
        'id'           => (int)$u['id'],
        'email'        => $u['email'],
        'display_name' => $u['display_name'],
        'status'       => $u['status'],
        'role'         => $u['role'],
    ];
}
