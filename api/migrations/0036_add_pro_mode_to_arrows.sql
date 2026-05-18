-- Pro-Modus pro Pfeil-Set statt global pro User:
-- Manche User kaufen mal fertige Pfeile (kein Schaft/Befiederung/Spitzen-Detail
-- nötig), mal bauen sie selbst zusammen (alle Komponenten relevant).
-- Der globale users.pro_mode bleibt im Schema (für Rückwärtskompatibilität),
-- wird aber im Frontend nicht mehr verwendet.

ALTER TABLE arrows
    ADD COLUMN pro_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER is_default;
