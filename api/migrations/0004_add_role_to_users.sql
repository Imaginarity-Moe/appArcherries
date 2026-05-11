ALTER TABLE users
ADD COLUMN role ENUM('admin','user','guest') NOT NULL DEFAULT 'user' AFTER status,
ADD INDEX idx_users_role (role)
