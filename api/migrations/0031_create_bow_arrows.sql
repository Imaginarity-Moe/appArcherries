-- Many-to-many zwischen Bögen und Pfeil-Sets.
-- Beide Seiten in ON DELETE CASCADE — wird ein Bogen/Pfeil gelöscht, fliegen
-- auch die Verknüpfungen raus.
CREATE TABLE IF NOT EXISTS bow_arrows (
    bow_id BIGINT UNSIGNED NOT NULL,
    arrow_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bow_id, arrow_id),
    INDEX idx_bow_arrows_arrow (arrow_id),
    CONSTRAINT fk_bow_arrows_bow   FOREIGN KEY (bow_id)   REFERENCES bows(id)   ON DELETE CASCADE,
    CONSTRAINT fk_bow_arrows_arrow FOREIGN KEY (arrow_id) REFERENCES arrows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
