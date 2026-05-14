ALTER TABLE trainings ADD COLUMN nfaa_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER discipline;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE shots;
TRUNCATE TABLE training_targets;
TRUNCATE TABLE training_participants;
TRUNCATE TABLE training_invitations;
TRUNCATE TABLE trainings;
SET FOREIGN_KEY_CHECKS = 1;
