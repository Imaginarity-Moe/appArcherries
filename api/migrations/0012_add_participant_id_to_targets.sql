ALTER TABLE training_targets ADD COLUMN participant_id BIGINT UNSIGNED NULL AFTER training_id;

UPDATE training_targets tt
JOIN training_participants tp ON tp.training_id = tt.training_id AND tp.role = 'owner'
SET tt.participant_id = tp.id
WHERE tt.participant_id IS NULL;

ALTER TABLE training_targets MODIFY participant_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE training_targets DROP INDEX uniq_training_target;
ALTER TABLE training_targets ADD UNIQUE KEY uniq_tpt (training_id, participant_id, target_index);
ALTER TABLE training_targets ADD CONSTRAINT fk_target_participant FOREIGN KEY (participant_id) REFERENCES training_participants(id) ON DELETE CASCADE;
