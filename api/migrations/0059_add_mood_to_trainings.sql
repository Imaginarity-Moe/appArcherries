-- Stimmung pro Training — Trainings-Tagebuch-Feature.
-- VARCHAR statt ENUM für Erweiterbarkeit ohne weitere Migrations.
-- Aktuelle Werte: 'great', 'good', 'neutral', 'tired', 'frustrated'
ALTER TABLE trainings
  ADD COLUMN mood VARCHAR(20) NULL AFTER notes;
