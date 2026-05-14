CREATE TABLE IF NOT EXISTS parcours_lanes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parcours_id BIGINT UNSIGNED NOT NULL,
    lane_number SMALLINT UNSIGNED NOT NULL,
    animal_description VARCHAR(160) NULL,
    distance_blue   DECIMAL(5,2) NULL,
    distance_red    DECIMAL(5,2) NULL,
    distance_yellow DECIMAL(5,2) NULL,
    distance_white  DECIMAL(5,2) NULL,
    notes TEXT NULL,
    image_path VARCHAR(255) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_parcours_lane (parcours_id, lane_number),
    INDEX idx_lanes_parcours (parcours_id),
    CONSTRAINT fk_lanes_parcours FOREIGN KEY (parcours_id) REFERENCES parcours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
