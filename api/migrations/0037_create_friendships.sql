-- Freundschafts-System.
-- Asymmetrisches Modell: 1 Row pro Anfrage mit requester/recipient.
-- Status 'pending' nach POST, 'accepted' nach Annehmen, 'blocked' nach Block.
-- Ablehnen löscht die Row, sodass später erneut angefragt werden kann.

CREATE TABLE IF NOT EXISTS friendships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_id BIGINT UNSIGNED NOT NULL,
    recipient_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uniq_friendship (requester_id, recipient_id),
    KEY idx_friendships_recipient (recipient_id, status),
    KEY idx_friendships_requester (requester_id, status),
    CONSTRAINT fk_friendships_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_friendships_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_friendship_not_self CHECK (requester_id <> recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
