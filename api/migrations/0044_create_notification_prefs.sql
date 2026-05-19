-- Granulare Benachrichtigungs-Einstellungen pro User × Kategorie × Channel.
--
-- WARUM:
--   Bisher gehen Mails+In-App-Notifs ohne Opt-Out raus. User soll pro Kategorie
--   getrennt entscheiden können (In-App vs. E-Mail). Auth-/Security-Mails sind
--   Pflicht und werden NICHT in dieser Tabelle modelliert.
--
-- DEFAULT-LOGIK: fehlende Row = enabled. Nur Opt-Out persistiert eine Row.
-- Das hält die Tabelle klein und gibt sichere Defaults für Neu-User.

CREATE TABLE notification_prefs (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    category    ENUM('social','invitations') NOT NULL,
    channel     ENUM('email','in_app') NOT NULL,
    enabled     TINYINT(1) NOT NULL DEFAULT 1,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_cat_chan (user_id, category, channel),
    INDEX idx_notif_prefs_user (user_id),
    CONSTRAINT fk_notif_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
