-- Profi-Modus: User-Toggle für granulare Komponenten-Pflege.
-- Wenn aktiv, kann der User in jedem Pfeil-Set vier separate Shop-Links
-- für Schaft, Befiederung, Nocken und Spitzen hinterlegen.

ALTER TABLE users
    ADD COLUMN pro_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

ALTER TABLE arrows
    ADD COLUMN purchase_url_shaft     VARCHAR(500) NULL AFTER purchase_url,
    ADD COLUMN purchase_url_fletching VARCHAR(500) NULL AFTER purchase_url_shaft,
    ADD COLUMN purchase_url_nocks     VARCHAR(500) NULL AFTER purchase_url_fletching,
    ADD COLUMN purchase_url_tips      VARCHAR(500) NULL AFTER purchase_url_nocks;
