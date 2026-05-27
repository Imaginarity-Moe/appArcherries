<?php
declare(strict_types=1);

/**
 * Geteilte Access-Prüfung: darf $user_id ein Training READ-only sehen?
 *
 * Erlaubt für:
 *  1. Owner (trainings.user_id = $user_id)
 *  2. Teilnehmer (training_participants.user_id = $user_id)
 *  3. Coach: $user_id ist als Coach in einem Verein, dem der Training-Owner
 *     auch angehört. Coach-Zugriff ist ausschließlich Read — Mutations
 *     bleiben durch `training_owned()` in routes/trainings.php geschützt.
 *
 * Wird sowohl von routes/trainings.php als auch von routes/stats.php genutzt.
 * Wenn die Bedingungen erweitert werden, IMMER hier zentral, sonst weichen
 * die beiden Endpunkte voneinander ab (genau das ist mal passiert).
 */
function user_can_read_training(int $user_id, int $training_id): bool
{
    // 1) Owner oder Teilnehmer
    $s = db()->prepare(
        'SELECT 1 FROM trainings t
         LEFT JOIN training_participants tp ON tp.training_id = t.id AND tp.user_id = ?
         WHERE t.id = ? AND (t.user_id = ? OR tp.user_id IS NOT NULL)
         LIMIT 1'
    );
    $s->execute([$user_id, $training_id, $user_id]);
    if ($s->fetchColumn()) return true;

    // 2) Coach in einem Verein des Owners
    $s = db()->prepare(
        'SELECT 1
         FROM trainings t
         JOIN club_members cm_owner ON cm_owner.user_id = t.user_id
         JOIN club_members cm_coach ON cm_coach.club_id = cm_owner.club_id
                                    AND cm_coach.user_id = ?
                                    AND cm_coach.role = "coach"
         WHERE t.id = ?
         LIMIT 1'
    );
    $s->execute([$user_id, $training_id]);
    return (bool)$s->fetchColumn();
}
