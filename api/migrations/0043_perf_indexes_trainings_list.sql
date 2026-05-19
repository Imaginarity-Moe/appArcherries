-- Performance-Indizes für die Trainings-Listen-Query auf dem Dashboard.
--
-- WARUM:
--   trainings_list filtert nach (user_id, archived_at IS NULL) und sortiert
--   nach started_at DESC. Der bisherige Index idx_trainings_user_started
--   (user_id, started_at) deckt das WHERE auf archived_at nicht ab und führt
--   bei vielen Trainings zu einem Filesort-Step. Der neue Composite-Index
--   inkludiert archived_at zwischen user_id und started_at.
--
--   training_participants hat bisher single-column-Indizes auf user_id und
--   training_id. Für den LEFT JOIN tp ON tp.training_id = t.id AND tp.user_id = ?
--   ist ein Composite (user_id, training_id) günstiger.
--
-- IDEMPOTENZ: bestehende Indizes (idx_trainings_user_started, idx_tp_user,
-- idx_tp_training) bleiben bewusst — sie werden für andere Queries genutzt.

ALTER TABLE trainings
    ADD INDEX idx_trainings_user_archived_started (user_id, archived_at, started_at);

ALTER TABLE training_participants
    ADD INDEX idx_tp_user_training (user_id, training_id);
