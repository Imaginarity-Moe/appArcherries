CREATE TABLE IF NOT EXISTS equipment_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Material-Kategorie
    kind ENUM('string','tab','release','other') NOT NULL,
    -- Sub-Kategorie freier Text — z.B. "Köcher", "Nockpunkt", "D-Loop" wenn kind='other'
    sub_kind VARCHAR(60) NULL,

    -- Identität
    name VARCHAR(120) NOT NULL,
    manufacturer VARCHAR(120) NULL,
    model VARCHAR(120) NULL,

    -- Meta
    notes TEXT NULL,
    image_path VARCHAR(255) NULL,
    purchase_url VARCHAR(500) NULL,
    purchased_at DATE NULL,
    price_cents INT NULL,

    -- Lifecycle: NULL = aktiv. Wird beim Event 'retired' gesetzt.
    retired_at DATE NULL,

    -- Per-Kind-Specs als JSON-Text (MariaDB JSON-Typ ist auf IONOS Shared nicht garantiert).
    -- Erst in späterer Iteration für strukturierte Felder genutzt — MVP lässt das leer.
    specs TEXT NULL,

    -- Default-Markierung pro Kategorie (z.B. "mein Trainingstab")
    is_default TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_eq_user_kind (user_id, kind),
    CONSTRAINT fk_eq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
