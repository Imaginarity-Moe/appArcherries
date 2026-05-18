-- Archivierung beendeter Trainings.
-- archived_at = NULL → aktiv/sichtbar in der Hauptliste.
-- archived_at gesetzt → in eigenem "Archiv"-Tab abrufbar.

ALTER TABLE trainings
    ADD COLUMN archived_at TIMESTAMP NULL DEFAULT NULL AFTER summary_score,
    ADD INDEX idx_trainings_archived (user_id, archived_at);
