-- Sync-Modus: gemeinsamer Stations-Cursor.
--
-- Im sync-Modus muss die aktuell aktive Station auf ALLEN Geräten gleich sein —
-- sonst bleibt jedes Gerät bei seinem lokalen stationIndex hängen. Mit dieser
-- Spalte rotiert das Backend nach dem letzten Spieler einer Station automatisch
-- weiter. Frontend liest current_station_index statt eigenem React-State.
--
-- Default 1 ist sicher für bestehende Trainings (alle Modi). Wird nur im
-- sync-Modus aktiv genutzt.

ALTER TABLE trainings
    ADD COLUMN current_station_index INT NOT NULL DEFAULT 1 AFTER current_turn_participant_id;
