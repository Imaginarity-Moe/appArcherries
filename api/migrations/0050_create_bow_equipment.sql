CREATE TABLE IF NOT EXISTS bow_equipment (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bow_id BIGINT UNSIGNED NOT NULL,
    equipment_item_id BIGINT UNSIGNED NOT NULL,
    -- Freier Rollen-Text, z.B. "Trainingstab", "Wettkampfsehne", "Backup"
    role VARCHAR(60) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_bow_equipment (bow_id, equipment_item_id),
    INDEX idx_be_bow (bow_id),
    INDEX idx_be_item (equipment_item_id),
    CONSTRAINT fk_be_bow FOREIGN KEY (bow_id) REFERENCES bows(id) ON DELETE CASCADE,
    CONSTRAINT fk_be_item FOREIGN KEY (equipment_item_id) REFERENCES equipment_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
