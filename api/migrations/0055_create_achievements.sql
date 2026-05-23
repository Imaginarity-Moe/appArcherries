-- User-Achievements: pro User wird festgehalten welche Achievements er erreicht hat.
-- Achievement-Definitionen liegen hardcoded im Code (api/lib/Achievements.php) —
-- diese Tabelle speichert nur die Verknüpfung User→Achievement + Zeitpunkt.
CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    achievement_key VARCHAR(60) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_ach (user_id, achievement_key),
    INDEX idx_user_ach_user (user_id),
    CONSTRAINT fk_user_ach_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
