CREATE TABLE IF NOT EXISTS bows (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    bow_type ENUM('recurve','compound','barebow','traditional') NOT NULL,
    draw_weight_lbs DECIMAL(5,2) NULL,
    arrow_spine VARCHAR(60) NULL,
    sight_marks TEXT NULL,
    notes TEXT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bows_user (user_id),
    CONSTRAINT fk_bows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
