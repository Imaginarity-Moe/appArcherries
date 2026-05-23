-- Soft-Delete-Marker. Wenn gesetzt: User ist anonymisiert, kann sich nicht mehr
-- einloggen, taucht in den meisten Listen nicht mehr auf. Bestehende Inhalte
-- (Reviews, geteilte Trainings, öffentliche Parcours, Friendships) bleiben in
-- der DB, werden aber als "Gelöschter User" gerendert.
ALTER TABLE users
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER last_seen_at,
  ADD INDEX idx_users_deleted (deleted_at);
