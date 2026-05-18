---
name: IONOS Reverse-Proxy schluckt /api/-Rewrites — index.php direkt in URL nutzen
description: Auf IONOS Shared Hosting funktionieren mod_rewrite-Front-Controller unter /api/ nicht — Workaround via /api/index.php/<route> in PATH_INFO
type: project
originSessionId: 791df5d4-2800-4b75-8e19-816a5c3b7e18
---
**Symptom (verbrannte Stunden wert):** Auf IONOS Shared Hosting werden Requests an
nicht-existente Pfade wie `/api/health` vom **vorgeschalteten Reverse-Proxy** auf
`/index.html` umgemappt (200 OK + SPA-HTML statt API-JSON), BEVOR Apache die
`api/.htaccess`-Rewrite-Regel `RewriteRule ^ index.php [L,QSA]` überhaupt sieht.
Die `mod_headers`-Direktiven aus derselben `.htaccess` greifen aber — das macht
die Diagnose tückisch (es wirkt, als würde `.htaccess` teilweise funktionieren).

**Erkennungsmerkmale in Response-Headern:**
- `X-WS-Origin: available`
- `Cache-Control: no-cache, no-store, must-revalidate` (von IONOS automatisch hinzugefügt)
- 200 OK statt 404 für jeden beliebigen nicht-existenten `/api/*`-Pfad
- Identischer ETag und Content-Length=432 (= das SPA-`index.html`)

**Workaround (in appArcherries umgesetzt):** Front-Controller direkt im Pfad ansprechen.
Statt `/api/<route>` ruft das Frontend `/api/index.php/<route>` auf. `index.php` ist eine
echte Datei → IONOS-Proxy lässt durch → Apache reicht die Subpath als `PATH_INFO` weiter.

**Konkrete Stellen:**
- `src/api/client.ts`: `const BASE = ... ?? "/api/index.php";`
- `api/lib/Request.php` → `req_path()` liest zuerst `$_SERVER['PATH_INFO']`, sonst Fallback
  auf REQUEST_URI-Strip
- `.env` / `.env.example`: `VITE_API_URL=/api/index.php`

**Why:** Spart Stunden Debugging beim nächsten IONOS-Projekt. Das Problem ist nicht
mod_rewrite-Konfiguration, sondern eine Schicht DAVOR (IONOS Webspace Routing).

**How to apply:** Bei neuen Routen einfach `/api/index.php/...` als Base annehmen.
Direkte PHP-Dateien (z. B. `/api/migrate.php`) funktionieren ohne Workaround, da sie
ebenfalls echte Dateien sind. Endpoint-per-Datei-Pattern (wie appTripSplit) wäre
die Alternative, würde aber den Front-Controller-Stil zerstören.

**Verwandtes:** appTripSplit umgeht das Problem durch endpoint-per-Datei
(`/api/auth/login.php` statt Router) — ist also auch ein valides Pattern auf IONOS.
