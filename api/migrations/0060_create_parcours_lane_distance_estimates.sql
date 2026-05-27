-- Crowdsourced Distance-Schätzungen pro Bahn.
-- Jeder User darf pro Bahn genau eine Schätzung abgeben (UNIQUE) — kann
-- aktualisieren oder zurückziehen. Aggregat (Median + count) wird zur Lese-Zeit
-- berechnet; individuelle user_ids werden nie an andere User ausgeliefert,
-- nur die eigene Schätzung des aufrufenden Users.
CREATE TABLE IF NOT EXISTS parcours_lane_distance_estimates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lane_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    estimated_distance_m DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_lane_user (lane_id, user_id),
    INDEX idx_estimates_lane (lane_id),
    CONSTRAINT fk_estimates_lane FOREIGN KEY (lane_id) REFERENCES parcours_lanes(id) ON DELETE CASCADE,
    CONSTRAINT fk_estimates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
