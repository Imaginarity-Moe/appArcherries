ALTER TABLE trainings
ADD COLUMN parcours_id BIGINT UNSIGNED NULL AFTER user_id,
ADD INDEX idx_trainings_parcours (parcours_id),
ADD CONSTRAINT fk_trainings_parcours
    FOREIGN KEY (parcours_id) REFERENCES parcours(id) ON DELETE SET NULL
