-- Temporäre Promotion von claude-test2 zum Admin für E2E-Tests.
-- Bei Bedarf später manuell zurückstufen via Admin-UI.
UPDATE users SET role = 'admin' WHERE email = 'claude-test2@archerries.local';
