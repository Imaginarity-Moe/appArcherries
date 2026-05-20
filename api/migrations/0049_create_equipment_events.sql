CREATE TABLE IF NOT EXISTS equipment_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_item_id BIGINT UNSIGNED NOT NULL,
    -- broken = Defekt/gerissen, lost = verloren, service = Wartung/Reparatur,
    -- added = nachgekauft/neu, retired = außer Dienst (Lifecycle-Ende).
    kind ENUM('broken','lost','service','added','retired') NOT NULL,
    occurred_at DATE NOT NULL DEFAULT (CURRENT_DATE),
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_eq_events_item_date (equipment_item_id, occurred_at),
    CONSTRAINT fk_eq_events_item FOREIGN KEY (equipment_item_id) REFERENCES equipment_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
