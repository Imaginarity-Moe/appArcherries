-- Dritter Live-Scoring-Modus: 'sync'.
--   solo   = Owner-Gerät scort alle durch (Rotation)
--   collab = jeder am eigenen Gerät, parallel
--   sync   = alle Geräte sehen denselben Stand; nur einer ist gleichzeitig
--            scoreberechtigt (Mutex). Lock wechselt beim Speichern (Turn-Yield).
--
-- current_turn_participant_id zeigt auf den training_participants-Eintrag,
-- der gerade scoren darf. NULL = noch nicht initialisiert (kein sync-Modus).

ALTER TABLE trainings
    MODIFY COLUMN shared_scoring_mode ENUM('solo','collab','sync') NOT NULL DEFAULT 'solo';

ALTER TABLE trainings
    ADD COLUMN current_turn_participant_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER shared_scoring_mode,
    ADD CONSTRAINT fk_current_turn_participant FOREIGN KEY (current_turn_participant_id)
        REFERENCES training_participants(id) ON DELETE SET NULL;
