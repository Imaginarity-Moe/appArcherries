---
name: appArcherries — Projektübersicht
description: Zweck, Hosting, Stack und Pattern der appArcherries (Bogensport-Tracker auf IONOS)
type: project
originSessionId: 791df5d4-2800-4b75-8e19-816a5c3b7e18
---
**appArcherries** ist eine neu zu bauende Mini-Webapp: ein Bogensport-Tracker, in dem
Nutzer Trainings, Pfeile und Scores erfassen und Statistiken sehen.

**Hosting:** IONOS Shared Hosting, Subdomain `archerries.mossig.de` (bereits eingerichtet,
DocumentRoot vom User bestätigt).

**Stack:**
- Frontend: Vite + React + TypeScript + Tailwind, React Router
- Backend: PHP 8.x, eigenes Mini-Router-Setup unter `/api`, PDO, kein Framework
- DB: MySQL 8.0 bei IONOS (Hostname/Port/User in `.env`)
- Auth: JWT (firebase/php-jwt) mit E-Mail-Verifizierung + Passwort-Reset
- Mail: PHPMailer über IONOS-SMTP (`smtp.ionos.de:587`, TLS, `noreply@creativecluster.de`)
- Deploy: `deploy.bat` ruft WinSCP-CLI mit `synchronize`-Befehl auf
- Migrations: eigenes `api/migrate.php`, geschützt durch `MIGRATE_SECRET`,
  Tracking-Tabelle `schema_migrations`. Migrationsdateien NIE ändern — nur neue anhängen.

**Why:** User wollte expliziten React-Stack auf IONOS, PHP-Backend, MySQL,
Ein-Klick-Deploy per .bat, und ein Migrate-Pattern für DB-Updates.

**How to apply:** Bei Änderungen an diesem Projekt diesen Stack respektieren. Frontend-
Routing braucht `.htaccess`-Rewrite für SPA. Backend-`vendor/` wird lokal gebaut und
mitgesynct (kein Composer auf dem Server). Geheimnisse aus `.env` lesen — `.env`
NIE per Deploy syncen, liegt einmalig manuell auf dem Server unter `api/.env`.

**Pattern-Vorbild:** bestehendes `appTripSplit` des Users (sichtbar in `.env`:
`JWT_SECRET`, `MIGRATE_SECRET`, `HISTORY_SYNC_SECRET`, `MAIL_*`-Block).

**Bewusst nicht im MVP:** Datenmodell für Trainings/Scores/Statistik — User
möchte das in einem separaten Gespräch festlegen, nachdem das Grundgerüst (Auth,
Migrate, Deploy) steht.
