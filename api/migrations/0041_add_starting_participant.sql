-- Bei target_practice mit mehreren Schützen alterniert die Start-Position pro Leg.
-- starting_participant_id zeigt auf den training_participants-Eintrag, der Leg 1
-- (bzw. Set 1) eröffnet. Im Leg N startet entsprechend Participant ((N-1) mod n)
-- ausgehend von der Reihenfolge in training_participants nach joined_at.
--
-- NULL = kein Start gewählt → Default ist der erste Participant (Owner).

ALTER TABLE trainings
    ADD COLUMN starting_participant_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER sets_to_win,
    ADD CONSTRAINT fk_starting_participant FOREIGN KEY (starting_participant_id)
        REFERENCES training_participants(id) ON DELETE SET NULL;
