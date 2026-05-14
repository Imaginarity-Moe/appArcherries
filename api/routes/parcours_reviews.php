<?php
declare(strict_types=1);

/**
 * Parcours-Reviews (Sterne 1–5 + optionaler Kommentar).
 *
 *  GET    /parcours/<id>/reviews                → Liste aller Reviews (mit user.display_name, avatar)
 *  POST   /parcours/<id>/reviews                → eigenes Review upserten { rating, comment? }
 *  DELETE /parcours/<id>/reviews/<rid>          → eigenes Review löschen
 *
 * Pro (parcours, user) genau 1 Review (UNIQUE in DB). Jeder eingeloggte User darf
 * Reviews zu beliebigen Parcours abgeben — die UI zeigt das nur für is_public an.
 */
function handle_parcours_reviews(string $method, int $user_id, int $parcours_id, string $rest): void
{
    // Existiert der Parcours? (Public oder eigener — bei privatem fremdem: 404)
    $s = db()->prepare('SELECT user_id, is_public FROM parcours WHERE id = ?');
    $s->execute([$parcours_id]);
    $p = $s->fetch();
    if (!$p) res_error('Not found', 404);
    $is_own = (int)$p['user_id'] === $user_id;
    $is_public = (int)$p['is_public'] === 1;
    if (!$is_own && !$is_public) res_error('Not found', 404);

    // /reviews
    if ($rest === '' || $rest === '/') {
        if ($method === 'GET')  { reviews_list($parcours_id); return; }
        if ($method === 'POST') { reviews_upsert($user_id, $parcours_id); return; }
        res_error('Method not allowed', 405);
    }

    // /reviews/<rid>
    if (preg_match('#^/(\d+)$#', $rest, $m)) {
        $rid = (int)$m[1];
        if ($method === 'DELETE') { reviews_delete($user_id, $parcours_id, $rid); return; }
        res_error('Method not allowed', 405);
    }

    res_error('Not found', 404);
}

function reviews_list(int $parcours_id): void
{
    $stmt = db()->prepare(
        'SELECT r.id, r.parcours_id, r.user_id, r.rating, r.comment, r.created_at, r.updated_at,
                u.display_name, u.avatar_path
         FROM parcours_reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.parcours_id = ?
         ORDER BY r.updated_at DESC'
    );
    $stmt->execute([$parcours_id]);
    $rows = array_map(function ($r) {
        return [
            'id'           => (int)$r['id'],
            'parcours_id'  => (int)$r['parcours_id'],
            'user_id'      => (int)$r['user_id'],
            'rating'       => (int)$r['rating'],
            'comment'      => $r['comment'],
            'created_at'   => $r['created_at'],
            'updated_at'   => $r['updated_at'],
            'display_name' => $r['display_name'],
            'avatar_url'   => $r['avatar_path'] ?: null,
        ];
    }, $stmt->fetchAll());
    res_json(['reviews' => $rows]);
}

function reviews_upsert(int $user_id, int $parcours_id): void
{
    $in = req_json();
    $rating = isset($in['rating']) ? (int)$in['rating'] : 0;
    if ($rating < 1 || $rating > 5) res_error('rating muss 1..5 sein');
    $comment = isset($in['comment']) ? trim((string)$in['comment']) : '';
    if ($comment === '') $comment = null;
    if ($comment !== null && mb_strlen($comment) > 2000) res_error('Kommentar zu lang (max 2000)');

    db()->prepare(
        'INSERT INTO parcours_reviews (parcours_id, user_id, rating, comment)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)'
    )->execute([$parcours_id, $user_id, $rating, $comment]);

    // Aktualisiertes Review zurückgeben
    $s = db()->prepare(
        'SELECT r.id, r.parcours_id, r.user_id, r.rating, r.comment, r.created_at, r.updated_at,
                u.display_name, u.avatar_path
         FROM parcours_reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.parcours_id = ? AND r.user_id = ?'
    );
    $s->execute([$parcours_id, $user_id]);
    $r = $s->fetch();
    res_json([
        'review' => [
            'id'           => (int)$r['id'],
            'parcours_id'  => (int)$r['parcours_id'],
            'user_id'      => (int)$r['user_id'],
            'rating'       => (int)$r['rating'],
            'comment'      => $r['comment'],
            'created_at'   => $r['created_at'],
            'updated_at'   => $r['updated_at'],
            'display_name' => $r['display_name'],
            'avatar_url'   => $r['avatar_path'] ?: null,
        ],
    ]);
}

function reviews_delete(int $user_id, int $parcours_id, int $rid): void
{
    // Nur eigenes Review darf gelöscht werden
    $stmt = db()->prepare('DELETE FROM parcours_reviews WHERE id = ? AND parcours_id = ? AND user_id = ?');
    $stmt->execute([$rid, $parcours_id, $user_id]);
    if ($stmt->rowCount() === 0) res_error('Not found', 404);
    res_json(['ok' => true]);
}

/** Aggregat: average rating + count (für parcours_serialize). */
function reviews_aggregate(int $parcours_id): array
{
    $s = db()->prepare('SELECT COUNT(*) AS cnt, AVG(rating) AS avg_rating FROM parcours_reviews WHERE parcours_id = ?');
    $s->execute([$parcours_id]);
    $row = $s->fetch();
    return [
        'review_count' => (int)($row['cnt'] ?? 0),
        'avg_rating'   => $row['avg_rating'] !== null ? round((float)$row['avg_rating'], 2) : null,
    ];
}
