CREATE TABLE IF NOT EXISTS training_participants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    training_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('owner','scorer','viewer') NOT NULL DEFAULT 'scorer',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_training_user (training_id, user_id),
    INDEX idx_tp_training (training_id),
    INDEX idx_tp_user (user_id),
    CONSTRAINT fk_tp_training FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_tp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO training_participants (training_id, user_id, role, joined_at)
SELECT id, user_id, 'owner', COALESCE(started_at, NOW()) FROM trainings;
