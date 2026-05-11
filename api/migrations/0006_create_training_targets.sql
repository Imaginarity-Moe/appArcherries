CREATE TABLE IF NOT EXISTS training_targets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    training_id BIGINT UNSIGNED NOT NULL,
    target_index SMALLINT UNSIGNED NOT NULL,
    animal_or_face VARCHAR(80) NULL,
    distance_m DECIMAL(5,2) NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_training_target (training_id, target_index),
    INDEX idx_training_targets_training (training_id),
    CONSTRAINT fk_training_targets_training
      FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
