-- Zweiter E2E-Test-User für Multi-User-Tests (Reviews, Highscore, Public-Parcours).
-- Passwort: ClaudeTest2_2026!
INSERT INTO users (email, password_hash, display_name, status, role)
VALUES (
  'claude-test2@archerries.local',
  '$2b$12$Bk68p5KsAeZ9Tx.V5kPdyOzahvFSOvje0V/koUxvj82dXH.LYjOiq',
  'Claude Test 2',
  'active',
  'user'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  status        = 'active',
  display_name  = VALUES(display_name);
