CREATE TABLE IF NOT EXISTS training_invitations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    training_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(64) NOT NULL,
    role ENUM('scorer','viewer') NOT NULL DEFAULT 'scorer',
    expires_at TIMESTAMP NULL,
    max_uses SMALLINT UNSIGNED NULL,
    used_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_token (token),
    INDEX idx_inv_training (training_id),
    CONSTRAINT fk_inv_training FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
