# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                  # bei SSL/peer-dep-Problemen: --strict-ssl=false --legacy-peer-deps
npm run dev                  # Vite-Dev-Server :5173, /api wird auf localhost:8000 geproxyt
npm run build                # tsc -b && vite build -> dist/
php -S localhost:8000 -t api # lokaler PHP-Server für das Backend
php api/migrate.php          # Migrationen lokal ausführen (CLI-Modus, kein Secret nötig)
deploy.bat                   # baut Frontend + synct via WinSCP nach IONOS
```

**Migration live triggern** (nach Deploy, bei Schema-Änderung):
```
curl.exe --ssl-no-revoke -X POST https://archerries.mossig.de/api/migrate.php -H "X-Migrate-Secret: <SECRET>"
```

Es gibt keine Lint- oder Test-Skripte; Typprüfung läuft via `tsc -b` als Teil von `npm run build`.

## Architektur

### IONOS-Routing-Workaround (LIES ZUERST)
Auf IONOS Shared Hosting fängt ein Reverse-Proxy alle `/api/<route>`-Anfragen ab und liefert die SPA-`index.html` statt die API zu erreichen — **bevor** Apache mod_rewrite greift. Workaround: das Frontend ruft `/api/index.php/<route>` direkt auf. `index.php` ist eine echte Datei, Apache reicht den Subpath als `PATH_INFO` weiter. Konkret:
- `src/api/client.ts` setzt `BASE = "/api/index.php"`
- `api/lib/Request.php::req_path()` liest zuerst `$_SERVER['PATH_INFO']`
- `dist/.htaccess` schließt `/api/` explizit vom SPA-Fallback aus
- `api/.htaccess` muss `RewriteRule ^ - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` setzen, sonst strippt IONOS den `Authorization`-Header (→ 401)

### Backend: Composer-frei
Eigenes Mini-Setup ohne Composer. Bibliotheken liegen direkt unter `api/lib/` (inkl. eingecheckter PHPMailer-Kopie unter `api/lib/PHPMailer/`). JWT wird inline mit `hash_hmac` gebaut, `.env` über einen winzigen Loader in `api/config.php` gelesen. **Nie `composer install` ausführen** — die README ist hier veraltet.

**Front-Controller**: `api/index.php` routet via Prefix-Match auf `api/routes/<resource>.php`. Jede Route-Datei exportiert eine `handle_*($method, $path)`-Funktion. Geteilte Helfer: `api/lib/Request.php` (req_path/method/json), `Response.php` (res_json/res_error), `Jwt.php`, `Auth.php` (Bearer-Token-Parser), `Mailer.php`, `Scoring.php`.

### Wertungssystem-Logik (Domänen-Kern)
`api/lib/Scoring.php::score_target()` muss **alle Pfeile eines Ziels gemeinsam** bewerten, weil bei IFAA-Disziplinen (`3d_ifaa`, `3d_bowhunter`) nur der erste treffende Pfeil zählt und sein Punktwert von der Sequenz-Nummer abhängt. 3D-IFAA: Vital 20/16/12, Wound 18/14/10 für 1./2./3. Pfeil. 3D-Bowhunter: Vital 5/4/3, Wound 3/2/1 für 1./2./3. Pfeil (3 Slots, nicht 4 — IFAA Bowhunter Round Standard). WA-3D und Feldbogen-WA werten jeden Pfeil unabhängig. Disziplinen-IDs: `3d_wa`, `3d_ifaa`, `3d_bowhunter`, `field_wa`, `simple`. Domänen-Hintergrund siehe [TODO.md](TODO.md) und Memory-Datei `reference_bogensport_scoring.md`.

**Drei Stellen müssen synchron bleiben** bei Wertungs-Änderungen: `api/lib/Scoring.php::score_arrow_seq()`, `src/lib/scoringPreview.ts::scoreArrowSeq()` (Offline-Cache-Berechnung), `previewArrowPoints()` in `src/pages/TrainingDetail.tsx` (UI-Live-Preview). Erste zwei sind identisch im Algorithmus, dritte arbeitet mit 0-indexed slots statt 1-indexed seq.

### Migrations
- Dateien: `api/migrations/NNNN_*.sql`, sortiert nach Dateinamen
- Tracking-Tabelle: `schema_migrations`
- **Bestehende Migrations NIE ändern** — nur neue mit aufsteigender Nummer anhängen
- **Keine Transaktionen** um DDL: MySQL macht bei `CREATE/ALTER TABLE` implicit commit; `rollBack()` würde werfen. `CREATE TABLE IF NOT EXISTS` macht das Re-Run-fähig.

### Frontend-Struktur
- `src/api/*.ts`: thin Fetch-Wrapper pro Resource; GETs gehen durch `apiCached()` (IDB-Cache-Fallback bei Offline), Mutations durch `api()`. Spezial-Wrapping pro Resource in `trainings.ts` (Offline-Outbox).
- `src/auth/AuthContext.tsx`: globaler Auth-State, kapselt `/me`-Hydration und Logout
- `src/pages/`: eine Datei pro Route (siehe `App.tsx` für die Map)
- `src/components/BullseyePad.tsx`: SVG-Click-Pad für Zonen-Auswahl beim Pfeil-Erfassen
- `src/i18n/`: i18next mit 8 Namespaces (common/auth/dashboard/training/parcours/stats/help/profile), DE = Fallback
- Theme: Tailwind-Custom-Palette "Modern Forest" (forest-grün + copper-Akzent); Score-Zahlen erhalten `.score`-Utility-Klasse mit `tabular-nums`

### PWA & Offline-Architektur (`src/lib/`)
Die App ist eine installierbare PWA mit voller Offline-Unterstützung. Drei Schichten:

1. **PWA-Shell** (`vite-plugin-pwa`): Manifest + Service-Worker via Workbox. SW precached alle Assets, navigateFallback auf `/index.html`, `/api/*` ist explizit von der SW-Routing ausgeschlossen (`navigateFallbackDenylist`). Update-Prompt in `components/PWAUpdatePrompt.tsx` mit `registerType: "prompt"`. **Icons in `public/`** sind Placeholder bis echtes Logo geliefert wird.
2. **IDB-Cache** (`lib/db.ts`, `lib/cache.ts`): IndexedDB-Store `responses` keyed by API-Pfad. `apiCached()` in `client.ts` macht Network-First mit Cache-Fallback. Schreibende Operationen invalidieren betroffene Caches.
3. **Outbox** (`lib/outbox.ts`, `lib/sync.ts`): Object-Store `outbox` queued POST/PATCH/DELETE wenn offline ODER bei Netzwerkfehler. `startSync()` läuft beim App-Boot, drained automatisch bei `online`-Event + alle 30s. 4xx-Fehler (außer 408/429) werden verworfen, alles andere mit Retry. **Temp-IDs** für offline angelegte Trainings (`tmp_xxx`) werden im Store `id_map` auf Server-IDs aufgelöst — `resolveTempIds()` rewriting in Pfaden und Bodies.

**Optimistic Updates**: `upsertTarget` etc. updaten den Cache mit lokal berechneten Scores via `lib/scoringPreview.ts` (Spiegel von `api/lib/Scoring.php`). UI zeigt Punkte sofort, Server-Sync läuft im Hintergrund.

**Visuelle Indikatoren**:
- `NetworkStatusIcon` (Header rechts): grün/online, kupfer mit Badge/pending, rot/offline. Tap öffnet Popover mit manuellem Sync.
- `useLivePolling()` Hook für Auto-Refresh bei geteilten Trainings (5s, pausiert bei Tab-hidden).

### Geteilte Runden (QR-Code-Einladungen)
- DB: `training_participants` (training_id, user_id, role: owner/scorer/viewer), `training_invitations` (token, expires_at, max_uses), `training_targets.participant_id`. Jedes Training hat min. 1 Owner-Participant (auto-created).
- Gast-User-Pattern: `users` mit `role='guest'` und `password_hash=NULL`. Kein zweites Auth-System — Gast bekommt normales JWT, kann nur über Token-Link rein. Migration `0013_allow_null_password_hash.sql` lockerte NOT-NULL-Constraint dafür.
- **Score-Isolation**: jeder Participant hat eigene Targets (UNIQUE-Key `(training_id, participant_id, target_index)`). Frontend filtert in `TrainingDetail.tsx` via `t.participant_id === training.my_participant_id`.
- Routes: `POST /trainings/<id>/invitations` (Owner), `GET/POST /join/<token>` (public). `app_join_url()` in `routes/invitations.php` baut `https://<app_url>/join/<token>` — das ist die Frontend-URL, die React-Router auf `pages/Join.tsx` mapped.

### Bogen-Profile
- DB: `bows` (name, bow_type, draw_weight_lbs, arrow_spine, sight_marks, notes, is_default). Standard-Bogen via UPDATE im `bows_create/update` (nur einer pro User), wird im NewTraining-Wizard vorausgewählt.
- Routes: CRUD unter `/bows` in `routes/bows.php`.
- Aktuell **kein FK** von `trainings` auf `bows` — der Wizard schreibt nur die abgeleitete `bow_type` ins Training. Wenn Stats-Filter pro einzelnem Bogen (statt nur Klasse) gewünscht: `trainings.bow_id` nachziehen.

### Bild-Uploads (`api/lib/Uploads.php`)
Geteilte Helper-Lib für GD-basierte Bild-Verarbeitung (Resize auf 1600px max, JPEG-Re-Encoding, MIME-Whitelist, 5MB-Limit). Wird genutzt für Parcours-Bilder und Stations-Fotos (`training_targets.image_path`). Bilder liegen unter `/uploads/parcours/` bzw. `/uploads/stations/`. Apache serviert sie direkt — Pfad ist relativ zur Domain.

Mobile-Upload: das Frontend nutzt `<input type="file" accept="image/*" capture="environment">` für direkten Kamera-Zugriff auf iOS/Android. Bild-Uploads sind **online-only** und bypassen die Offline-Outbox (Binär-Daten passen nicht ins JSON-Outbox-Schema). Siehe `src/components/StationPhoto.tsx`.

### Code-Splitting & Bundle
`vite.config.ts::build.rollupOptions.output.manualChunks` splittet Vendor-Code in eigene Chunks (`vendor-react`, `vendor-i18n`, `vendor-charts`, `vendor-leaflet`, `vendor-icons`, `vendor-idb`). Schwere Pages (`Stats`, `TrainingSummary`, alle `Parcours*`, `Bows`) werden via `React.lazy` erst beim Routing geladen — gewrappt in `<Suspense>` (siehe `App.tsx`). `InviteModal` (zieht `qrcode.react` rein) wird in `TrainingDetail` lazy geladen. **Initial Load ~109KB gzipped**, schwere Chunks (Recharts ~113KB, Leaflet ~45KB) kommen erst beim Route-Besuch.

## Deploy

`deploy.bat` ruft WinSCP-CLI mit `deploy.winscp` auf:
1. `npm run build` → `dist/`
2. `synchronize remote "dist" "<docroot>"` (kein `-delete` — würde `/.env` und `/api` killen)
3. Explizit `put` für alle Dotfiles (`.htaccess` in dist + api + uploads) — WinSCP skipt Dotfiles bei gleicher Mtime
4. `synchronize remote "api" "/api"`

**Server-State, der NIE per Deploy überschrieben wird**:
- `<docroot>/.env` (eine Ebene über `api/`, manuell einmalig hochgeladen — `api/config.php` liest `__DIR__ . '/../.env'`)
- `<docroot>/uploads/parcours/` und `<docroot>/uploads/stations/` (User-Uploads)

`.env.deploy.cmd` (gitignored) enthält FTP_HOST/USER/PASS/REMOTE_ROOT. Muss **CRLF-Zeilenenden** haben und nicht via DelayedExpansion expandiert werden (sonst frisst Batch `!` im Passwort).

Nach Frontend-Deploy: **Strg+F5** im Browser — Vite-Bundle-Hashes ändern sich, aber der Browser cached die alte `index.html`.

## Stack-Konventionen
- **Bcrypt cost=12** für Passwörter (in `routes/auth.php`)
- **MAIL_FROM muss = MAIL_USERNAME** sein (IONOS-SMTP-Anti-Spoof); Wunsch-Absender via Reply-To
- Bild-Uploads gehen durch `api/lib/Uploads.php::process_image_upload()` (GD-Resize auf 1600px, JPEG-Re-Encode, MIME-Whitelist, 5MB-Limit). Aktuell genutzt von `routes/parcours.php` (alte Inline-Variante) und `routes/trainings.php` (neue Variante über die Lib). Bei neuem Upload-Endpoint die Lib nutzen, nicht duplizieren.
- Recharts braucht `react-is` als peer-dep, das wird bei `--legacy-peer-deps` nicht auto-installiert
- iOS Safari erlaubt Service-Worker nur über HTTPS (Ausnahme: `localhost`). PWA-Install auf dem iPhone deshalb immer über `https://archerries.mossig.de` testen, nicht über die LAN-IP.
- Top-Banner unter dem iOS-Notch ist im PWA-Standalone-Mode kaum sichtbar — Status-Indikatoren gehören in den Header (siehe `NetworkStatusIcon`).
- Binär-Uploads (Bilder) gehen **nicht** durch die Offline-Outbox — die queued nur JSON. Foto-Upload braucht Online.
