-- Neue Rolle: superadmin. Über admin gestellt — kann andere Admins/Superadmins
-- verwalten, kann selbst nicht gelöscht werden, mind. 1 Superadmin muss bleiben.
-- Normaler 'admin' kann ab jetzt nur noch User und Guests verwalten.
ALTER TABLE users
  MODIFY COLUMN role ENUM('superadmin','admin','user','guest') NOT NULL DEFAULT 'user';

-- Den App-Eigentümer als Superadmin setzen.
UPDATE users SET role = 'superadmin' WHERE email = 'markus@mossig.de';
