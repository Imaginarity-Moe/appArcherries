CREATE TABLE IF NOT EXISTS trainings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    discipline ENUM('3d_wa','3d_ifaa','3d_bowhunter','field_wa','simple') NOT NULL,
    bow_type ENUM('recurve','compound','barebow','traditional') NOT NULL,
    peg_color ENUM('blue','red','yellow','white') NULL,
    distance_marked TINYINT(1) NULL,
    location VARCHAR(120) NULL,
    weather VARCHAR(120) NULL,
    notes TEXT NULL,
    summary_score INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_trainings_user_started (user_id, started_at),
    INDEX idx_trainings_discipline (discipline),
    CONSTRAINT fk_trainings_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
