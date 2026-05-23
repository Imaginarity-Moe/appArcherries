<?php
declare(strict_types=1);

/**
 * Achievement-Definitionen + Evaluation.
 *
 * Lazy-Evaluation: Wenn der User /me/achievements aufruft, prüfen wir
 * gegen die DB-Aggregate alle bisher nicht-unlocked Achievements und schalten
 * neue frei. Kein Background-Job nötig — ist günstig genug für jeden Aufruf.
 */

const ACHIEVEMENTS = [
    // ─── Erste Schritte ──────────────────────────────────────────────
    ['key' => 'first_training',      'icon' => '🎯', 'label' => 'Erster Schuss',         'desc' => 'Dein allererstes Training angelegt'],
    ['key' => 'first_ended',         'icon' => '🏁', 'label' => 'Durchgezogen',          'desc' => 'Erstes Training bis zum Ende durchgespielt'],
    ['key' => 'first_bow',           'icon' => '🏹', 'label' => 'Bogen-Sammler',         'desc' => 'Ersten Bogen mit Specs angelegt'],
    ['key' => 'first_parcours',      'icon' => '🗺️', 'label' => 'Kartograph',           'desc' => 'Eigenen Parcours angelegt'],
    ['key' => 'first_arrows',        'icon' => '📦', 'label' => 'Pfeil-Mensch',          'desc' => 'Erstes Pfeil-Set mit Spine + Specs angelegt'],

    // ─── Volume ──────────────────────────────────────────────────────
    ['key' => 'trainings_10',        'icon' => '🔟', 'label' => 'Zehn-Kämpfer',          'desc' => '10 Trainings beendet'],
    ['key' => 'trainings_50',        'icon' => '💯', 'label' => 'Halbes Hundert',        'desc' => '50 Trainings beendet'],
    ['key' => 'trainings_100',       'icon' => '💎', 'label' => 'Centurion',             'desc' => '100 Trainings beendet'],

    // ─── Disziplin-Vielfalt ──────────────────────────────────────────
    ['key' => 'all_3d_variants',     'icon' => '🦌', 'label' => '3D-Allesschützer',      'desc' => 'Mindestens eines in jeder 3D-Wertung (WA, IFAA Standard, Hunter, Animal, Bowhunter)'],
    ['key' => 'all_bow_types',       'icon' => '🎭', 'label' => 'Vielseitig',            'desc' => 'Mit allen vier Bogenklassen mindestens je 1 Training'],

    // ─── Score-Achievements ──────────────────────────────────────────
    ['key' => 'first_published',     'icon' => '🏆', 'label' => 'Im Highscore',          'desc' => 'Erstes Training in den öffentlichen Highscore aufgenommen'],
    ['key' => 'score_300',           'icon' => '🥉', 'label' => '300+ Punkte',           'desc' => 'Training mit 300+ Punkten Summary-Score'],
    ['key' => 'score_500',           'icon' => '🥈', 'label' => '500+ Punkte',           'desc' => 'Training mit 500+ Punkten Summary-Score'],

    // ─── Social ──────────────────────────────────────────────────────
    ['key' => 'first_friend',        'icon' => '🤝', 'label' => 'Verbunden',             'desc' => 'Ersten Freund hinzugefügt'],
    ['key' => 'first_review',        'icon' => '⭐', 'label' => 'Bewerter',              'desc' => 'Ersten Parcours-Review geschrieben'],
    ['key' => 'first_shared',        'icon' => '👥', 'label' => 'Gastgeber',             'desc' => 'Erstes Training mit mindestens einem Mitspieler'],

    // ─── Streaks ─────────────────────────────────────────────────────
    ['key' => 'streak_3',            'icon' => '🔥', 'label' => '3-Tage-Streak',         'desc' => 'An 3 Tagen in Folge geschossen'],
    ['key' => 'streak_7',            'icon' => '🔥🔥', 'label' => 'Wochen-Streak',       'desc' => 'An 7 Tagen in Folge geschossen'],
    ['key' => 'streak_30',           'icon' => '🔥🔥🔥', 'label' => 'Monats-Streak',     'desc' => 'An 30 Tagen in Folge geschossen'],
];

/**
 * Liefert alle Achievement-Defs als assoziatives Array (key → def).
 * @return array<string, array{key:string,icon:string,label:string,desc:string}>
 */
function achievements_all(): array
{
    $out = [];
    foreach (ACHIEVEMENTS as $a) $out[$a['key']] = $a;
    return $out;
}

/**
 * Liefert alle bereits unlocked Achievement-Keys + unlock-Zeitpunkt.
 * @return array<string, string> key → ISO-Timestamp
 */
function achievements_unlocked_for(int $user_id): array
{
    $stmt = db()->prepare('SELECT achievement_key, unlocked_at FROM user_achievements WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $out[$r['achievement_key']] = $r['unlocked_at'];
    }
    return $out;
}

/**
 * Evaluiert alle nicht-unlocked Achievements gegen den DB-Stand und schaltet sie ggf. frei.
 * @return string[] Liste der gerade neu freigeschalteten Keys (für UI-Toast).
 */
function achievements_evaluate(int $user_id): array
{
    $unlocked = achievements_unlocked_for($user_id);
    $newly = [];

    $check = function (string $key, bool $condition) use ($user_id, &$unlocked, &$newly): void {
        if ($condition && !isset($unlocked[$key])) {
            try {
                db()->prepare('INSERT IGNORE INTO user_achievements (user_id, achievement_key) VALUES (?, ?)')
                    ->execute([$user_id, $key]);
                $unlocked[$key] = date('c');
                $newly[] = $key;
            } catch (Throwable $e) {
                error_log("[achievements] insert failed for $key: " . $e->getMessage());
            }
        }
    };

    // Aggregate sammeln
    $stmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $training_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ? AND ended_at IS NOT NULL');
    $stmt->execute([$user_id]);
    $ended_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT COUNT(*) FROM bows WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $bow_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT COUNT(*) FROM parcours WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $parcours_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT COUNT(*) FROM arrows WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $arrows_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT MAX(summary_score) FROM trainings WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $max_score = (int)($stmt->fetchColumn() ?: 0);

    $stmt = db()->prepare('SELECT COUNT(*) FROM trainings WHERE user_id = ? AND published_to_highscore = 1');
    $stmt->execute([$user_id]);
    $published_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare("SELECT DISTINCT discipline FROM trainings WHERE user_id = ? AND discipline LIKE '3d%'");
    $stmt->execute([$user_id]);
    $disciplines_3d = array_map(fn($r) => $r['discipline'], $stmt->fetchAll());

    $stmt = db()->prepare('SELECT DISTINCT bow_type FROM trainings WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $bow_types_used = array_map(fn($r) => $r['bow_type'], $stmt->fetchAll());

    $stmt = db()->prepare("SELECT COUNT(*) FROM friendships WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'");
    $stmt->execute([$user_id, $user_id]);
    $friends_count = (int)$stmt->fetchColumn();

    $stmt = db()->prepare('SELECT COUNT(*) FROM parcours_reviews WHERE user_id = ?');
    $stmt->execute([$user_id]);
    $reviews_count = (int)$stmt->fetchColumn();

    // Shared Training: hat irgendein Training > 1 Participant?
    $stmt = db()->prepare("
        SELECT COUNT(DISTINCT tp.training_id) FROM training_participants tp
        JOIN trainings t ON t.id = tp.training_id
        WHERE t.user_id = ? AND tp.training_id IN (
            SELECT training_id FROM training_participants GROUP BY training_id HAVING COUNT(*) > 1
        )
    ");
    $stmt->execute([$user_id]);
    $shared_count = (int)$stmt->fetchColumn();

    // Streak: längste Sequenz aufeinanderfolgender Tage mit min. 1 Training
    $stmt = db()->prepare("
        SELECT DATE(started_at) AS d FROM trainings
        WHERE user_id = ? AND started_at IS NOT NULL
        GROUP BY DATE(started_at)
        ORDER BY d ASC
    ");
    $stmt->execute([$user_id]);
    $days = array_map(fn($r) => $r['d'], $stmt->fetchAll());
    $longest_streak = streak_longest($days);

    // ─── Checks ──
    $check('first_training',  $training_count >= 1);
    $check('first_ended',     $ended_count    >= 1);
    $check('first_bow',       $bow_count      >= 1);
    $check('first_parcours',  $parcours_count >= 1);
    $check('first_arrows',    $arrows_count   >= 1);

    $check('trainings_10',    $ended_count    >= 10);
    $check('trainings_50',    $ended_count    >= 50);
    $check('trainings_100',   $ended_count    >= 100);

    $required_3d = ['3d_wa', '3d_ifaa', '3d_ifaa_hunter', '3d_ifaa_animal', '3d_bowhunter'];
    $check('all_3d_variants', count(array_intersect($required_3d, $disciplines_3d)) === count($required_3d));

    $required_bows = ['recurve', 'compound', 'barebow', 'traditional'];
    $check('all_bow_types',   count(array_intersect($required_bows, $bow_types_used)) === count($required_bows));

    $check('first_published', $published_count >= 1);
    $check('score_300',       $max_score >= 300);
    $check('score_500',       $max_score >= 500);

    $check('first_friend',    $friends_count   >= 1);
    $check('first_review',    $reviews_count   >= 1);
    $check('first_shared',    $shared_count    >= 1);

    $check('streak_3',        $longest_streak >= 3);
    $check('streak_7',        $longest_streak >= 7);
    $check('streak_30',       $longest_streak >= 30);

    return $newly;
}

/**
 * Berechnet die längste aufeinanderfolgende Tage-Sequenz aus einer sortierten
 * Liste von 'YYYY-MM-DD'-Strings.
 */
function streak_longest(array $sorted_days): int
{
    if (empty($sorted_days)) return 0;
    $longest = 1;
    $current = 1;
    for ($i = 1; $i < count($sorted_days); $i++) {
        $prev = strtotime($sorted_days[$i - 1]);
        $cur  = strtotime($sorted_days[$i]);
        $delta_days = round(($cur - $prev) / 86400);
        if ($delta_days === 1.0) {
            $current++;
            if ($current > $longest) $longest = $current;
        } else {
            $current = 1;
        }
    }
    return $longest;
}

/**
 * Aktuelle (laufende) Streak: zählt rückwärts von heute.
 */
function streak_current(int $user_id): int
{
    $stmt = db()->prepare("
        SELECT DATE(started_at) AS d FROM trainings
        WHERE user_id = ? AND started_at IS NOT NULL
        GROUP BY DATE(started_at)
        ORDER BY d DESC
        LIMIT 90
    ");
    $stmt->execute([$user_id]);
    $days = array_map(fn($r) => $r['d'], $stmt->fetchAll());
    if (empty($days)) return 0;

    // Wenn der letzte Trainings-Tag älter als gestern ist → Streak ist vorbei
    $today = (int)floor(time() / 86400);
    $last  = (int)floor(strtotime($days[0]) / 86400);
    if ($today - $last > 1) return 0;

    $streak = 1;
    for ($i = 1; $i < count($days); $i++) {
        $cur  = (int)floor(strtotime($days[$i - 1]) / 86400);
        $prev = (int)floor(strtotime($days[$i]) / 86400);
        if ($cur - $prev === 1) $streak++;
        else break;
    }
    return $streak;
}
