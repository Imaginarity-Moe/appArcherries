-- Neue Discipline "target_practice" für freies Schießen auf Scheiben.
-- Konfigurierbar: Pfeile pro Durchgang (Leg), Anzahl Durchgänge, Distanz,
-- Ring-Anzahl der Scheibe, Wertungs-Modus (points / legs / sets).
--
-- Wertung:
--   points   = Summe aller Pfeile, höchste Punktzahl gewinnt
--   legs     = best of N Legs — pro Leg gewinnt höhere End-Summe,
--              wer zuerst legs_to_win Legs hat, gewinnt
--   sets     = best of M Sets, jeder Set = best of N Legs (wie Darts)
--
-- Multi-Player über existierende training_participants — pro Pfeil wird
-- live live verglichen.

ALTER TABLE trainings
    MODIFY COLUMN discipline ENUM(
        '3d_wa', '3d_ifaa', '3d_ifaa_hunter', '3d_ifaa_animal', '3d_bowhunter',
        'field_wa', 'field_ifaa', 'simple', 'target_practice'
    ) NOT NULL;

ALTER TABLE trainings
    ADD COLUMN arrows_per_end    TINYINT  UNSIGNED NULL DEFAULT NULL AFTER notes,
    ADD COLUMN num_ends          SMALLINT UNSIGNED NULL DEFAULT NULL AFTER arrows_per_end,
    ADD COLUMN target_distance_m SMALLINT UNSIGNED NULL DEFAULT NULL AFTER num_ends,
    ADD COLUMN target_rings      TINYINT  UNSIGNED NULL DEFAULT NULL AFTER target_distance_m,
    ADD COLUMN scoring_mode      ENUM('points','legs','sets') NULL DEFAULT NULL AFTER target_rings,
    ADD COLUMN legs_to_win       TINYINT UNSIGNED NULL DEFAULT NULL AFTER scoring_mode,
    ADD COLUMN sets_to_win       TINYINT UNSIGNED NULL DEFAULT NULL AFTER legs_to_win;
