CREATE TABLE IF NOT EXISTS shots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    target_id BIGINT UNSIGNED NOT NULL,
    arrow_seq TINYINT UNSIGNED NOT NULL,
    zone VARCHAR(20) NULL,
    points SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_target_arrow (target_id, arrow_seq),
    INDEX idx_shots_target (target_id),
    CONSTRAINT fk_shots_target
      FOREIGN KEY (target_id) REFERENCES training_targets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
