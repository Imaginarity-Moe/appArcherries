# appArcherries

Bogensport-Tracker — React + PHP + MySQL auf IONOS.

## Stack
- **Frontend**: Vite + React + TypeScript + Tailwind CSS, React Router
- **Backend**: PHP 8, eigenes Mini-Router-Setup, PDO, JWT-Auth, PHPMailer
- **DB**: MySQL 8.0 (IONOS)
- **Deploy**: WinSCP-CLI via `deploy.bat`

## Setup (lokal)

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Backend (in zweitem Terminal)
cd api
composer install
php -S localhost:8000 -t .
```

Die `.env` muss im Projekt-Root liegen (Vorlage: `.env.example`).

## DB-Migrationen

```bash
# Lokal
php api/migrate.php

# Live (nach Deploy)
curl -X POST https://archerries.mossig.de/api/migrate.php \
     -H "X-Migrate-Secret: <MIGRATE_SECRET>"
```

Neue Migration: in `api/migrations/NNNN_*.sql` anlegen — **nie eine bestehende ändern**.

## Deploy

1. `deploy.bat` einmalig anpassen: `REMOTE_ROOT` auf den DocumentRoot der Subdomain setzen.
2. Server-seitige `.env` einmalig per WinSCP-GUI nach `<docroot>/api/.env` hochladen.
3. `deploy.bat` ausführen — baut Frontend, installiert Composer-Deps, synct via WinSCP.
4. Bei DB-Änderungen: Migrate-URL aufrufen (siehe oben).

## Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/auth/register` | Konto anlegen + Verify-Mail |
| GET  | `/api/auth/verify?token=…` | Konto aktivieren |
| POST | `/api/auth/login` | JWT-Token + User |
| POST | `/api/auth/forgot-password` | Reset-Mail |
| POST | `/api/auth/reset-password` | Passwort setzen |
| GET  | `/api/me` | Aktueller User (JWT erforderlich) |
| GET  | `/api/health` | Healthcheck |
