-- Onboarding-Status pro User. NULL = noch nicht durchgegangen, Timestamp = abgeschlossen.
-- Gäste (role='guest') werden vom Onboarding ausgenommen — sie kommen per Token-Link rein.
ALTER TABLE users
ADD COLUMN onboarding_completed_at TIMESTAMP NULL DEFAULT NULL AFTER role;

-- Bereits existierende User: als „abgeschlossen" markieren, damit sie nicht durchs
-- Onboarding gezwungen werden. Neue Registrierungen bleiben NULL.
UPDATE users SET onboarding_completed_at = NOW() WHERE onboarding_completed_at IS NULL;
