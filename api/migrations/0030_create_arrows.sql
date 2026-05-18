CREATE TABLE IF NOT EXISTS arrows (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Identität
    name VARCHAR(120) NOT NULL,
    manufacturer VARCHAR(120) NULL,
    model VARCHAR(120) NULL,

    -- Schaft
    material ENUM('carbon','aluminium','carbon_aluminium','wood','fiberglass') NULL,
    diameter_mm DECIMAL(4,2) NULL,
    spine VARCHAR(16) NULL,
    length_inch DECIMAL(4,1) NULL,
    gpi DECIMAL(5,2) NULL,

    -- Befiederung
    fletching_type ENUM('natural','vane','spin_vane') NULL,
    fletching_length_inch DECIMAL(3,1) NULL,
    fletching_count TINYINT UNSIGNED NULL,
    fletching_helix TINYINT(1) NULL,
    fletching_colors VARCHAR(120) NULL,

    -- Nocken
    nock_type ENUM('press_fit','pin','other') NULL,
    nock_manufacturer VARCHAR(120) NULL,
    nock_color VARCHAR(60) NULL,

    -- Spitzen
    tip_type ENUM('field','target','bullet','broadhead') NULL,
    tip_weight_grains SMALLINT UNSIGNED NULL,
    tip_manufacturer VARCHAR(120) NULL,
    tip_replaceable TINYINT(1) NULL,

    -- Bestand
    count_total SMALLINT UNSIGNED NULL,
    count_broken SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    count_lost SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    purchased_at DATE NULL,
    price_per_arrow_cents INT NULL,

    -- Meta
    notes TEXT NULL,
    image_path VARCHAR(255) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_arrows_user (user_id),
    CONSTRAINT fk_arrows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
