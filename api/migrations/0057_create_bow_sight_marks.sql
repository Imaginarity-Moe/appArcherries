-- Visiermarken pro Bogen für den Sight-Marks-Calculator.
-- User trägt 2–10 bekannte (Distanz, Markenwert)-Paare ein,
-- App interpoliert per quadratischer Regression alle Zwischen-Distanzen.
CREATE TABLE IF NOT EXISTS bow_sight_marks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bow_id BIGINT UNSIGNED NOT NULL,
    distance_m DECIMAL(5,2) NOT NULL,
    mark_value DECIMAL(8,3) NOT NULL,
    notes VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_bow_distance (bow_id, distance_m),
    INDEX idx_sm_bow (bow_id),
    CONSTRAINT fk_sm_bow FOREIGN KEY (bow_id) REFERENCES bows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
