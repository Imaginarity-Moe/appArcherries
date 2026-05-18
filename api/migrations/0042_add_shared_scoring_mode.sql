-- Live-Scoring-Modus bei Multi-Player target_practice:
--   solo   = Owner scort für alle, Rotation zwischen Spielern (Default)
--   collab = jeder Spieler scort selbst am eigenen Gerät; alle sehen die
--            Marker aller Spieler auf dem Pad via Live-Polling

ALTER TABLE trainings
    ADD COLUMN shared_scoring_mode ENUM('solo','collab') NOT NULL DEFAULT 'solo'
    AFTER starting_participant_id;
