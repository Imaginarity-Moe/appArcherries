-- Verein-Anbindung MVP: Mehrere User schließen sich zu einem "Club" zusammen.
-- - clubs.invite_code: 8-Zeichen-Random, Share-Link enthält ihn. Per
--   POST /clubs/join {invite_code} trittst du bei.
-- - club_members.role: 'admin' (kann Club editieren, Members entfernen,
--   Code rotieren) vs. 'member'. Creator wird automatisch admin.
-- - slug ist UNIQUE für künftige /clubs/<slug>-URLs (aktuell numerisch via id).
CREATE TABLE IF NOT EXISTS clubs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(80) NOT NULL,
    description TEXT NULL,
    invite_code CHAR(8) NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_slug (slug),
    UNIQUE KEY uniq_invite_code (invite_code),
    INDEX idx_clubs_created_by (created_by),
    CONSTRAINT fk_clubs_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_members (
    club_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (club_id, user_id),
    INDEX idx_members_user (user_id),
    CONSTRAINT fk_members_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
