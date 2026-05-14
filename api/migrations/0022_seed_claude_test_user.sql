-- Idempotent: legt den Claude-Test-User an oder updated seine Credentials.
-- Passwort (bcrypt cost=12): ClaudeTest_2026!
-- Account dient ausschließlich für automatisierte E2E-Tests (Playwright).
INSERT INTO users (email, password_hash, display_name, status, role)
VALUES (
  'claude-test@archerries.local',
  '$2b$12$RdhshgvnP/FVwaM83j57UuXeXGYXjdSmeaJTY2MaFamNrGiMJ88Za',
  'Claude Test',
  'active',
  'user'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  status        = 'active',
  display_name  = VALUES(display_name);
