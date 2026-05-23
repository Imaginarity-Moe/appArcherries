-- Wann war der User zuletzt aktiv (= zuletzt authentifizierte Anfrage)?
-- Wird in Auth.php throttled aktualisiert (max 1×/Minute pro User).
-- "Online" = NOW() - last_seen_at < ~5 Minuten — Schwelle wird im Frontend bestimmt.
ALTER TABLE users
  ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER onboarding_completed_at,
  ADD INDEX idx_users_last_seen (last_seen_at);
