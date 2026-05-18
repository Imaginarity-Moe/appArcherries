-- Equipment-Loadout pro Training: optionale FK auf bows.
-- bow_type bleibt als denormalisierte Spalte erhalten (für Stats-Aggregate
-- wenn der Bogen gelöscht wurde, ON DELETE SET NULL hält bow_type-Wert).
ALTER TABLE trainings
  ADD COLUMN bow_id BIGINT UNSIGNED NULL AFTER bow_type;

ALTER TABLE trainings
  ADD CONSTRAINT fk_trainings_bow
    FOREIGN KEY (bow_id) REFERENCES bows(id)
    ON DELETE SET NULL;

CREATE INDEX idx_trainings_bow ON trainings (bow_id);
