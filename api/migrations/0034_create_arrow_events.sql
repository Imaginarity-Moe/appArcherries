CREATE TABLE IF NOT EXISTS arrow_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    arrow_id BIGINT UNSIGNED NOT NULL,
    -- broken = beschädigt, lost = verloren, added = nachgekauft, replaced = repariert/ersetzt
    kind ENUM('broken','lost','added','replaced') NOT NULL,
    count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    occurred_at DATE NOT NULL DEFAULT (CURRENT_DATE),
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arrow_events_arrow_date (arrow_id, occurred_at),
    CONSTRAINT fk_arrow_events_arrow FOREIGN KEY (arrow_id) REFERENCES arrows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
