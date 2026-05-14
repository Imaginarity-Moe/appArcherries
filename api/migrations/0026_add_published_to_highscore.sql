ALTER TABLE trainings ADD COLUMN published_to_highscore TINYINT(1) NOT NULL DEFAULT 0 AFTER summary_score;
CREATE INDEX idx_trainings_highscore ON trainings (parcours_id, discipline, bow_type, published_to_highscore);
