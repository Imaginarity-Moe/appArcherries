---
name: appArcherries — aktueller Live-Status & nächste Schritte
description: Was steht, was läuft, was noch offen ist. Wird am Ende jeder Session aktualisiert.
type: project
originSessionId: 791df5d4-2800-4b75-8e19-816a5c3b7e18
---
**Letzte Aktualisierung:** 2026-05-19 (Spinner-System + Sync-Modus + Notification-Prefs + SWR + Aufnahme-Vokabular + Robustness gegen IONOS-504er)

## Session 2026-05-19 — die wichtigsten Änderungen

### Sync-Modus für Multi-Player target_practice (Migrations 0045, 0046)
Dritter `shared_scoring_mode` neben `solo`/`collab`:
- **`sync`** = Mutex-Lock pro Spieler. Backend hält `current_turn_participant_id` und `current_station_index`. Nur der aktuelle Turn-Inhaber darf via `targets_create` schreiben (sonst HTTP 423 Locked).
- **`advance_sync_turn`** rotiert Turn nach `yield: true` im body. Wenn alle Spieler die aktuelle Station gescored haben → `current_station_index++` + Turn zurück auf ersten Spieler. Bei `num_ends`-Überlauf wird `ended_at = NOW()` gesetzt.
- **`POST /trainings/<id>/turn`** Owner-only Force-Übernahme (z. B. wenn Gast hängt).
- **Frontend Status-Banner** „Du bist dran" / „X scort gerade" + Owner-Übernehmen-Button.
- **Auto-Open**: Gäste werden bei Polling-Refresh automatisch zur `current_station_index` navigiert. Owner bleibt in der Übersicht (sonst kann er nicht einladen — wichtige UX-Lektion vom 19.05.).
- **Live-Push** debounced 1.2s — jeder Pfeil-Click in Sync pusht ans Backend, Gegner sieht Marker via 5s-Polling (Status-Mirror, kein Live-Marker-Mirror).
- **Darts-Style-Anzeige** im Live-Modus: pro Spieler aktueller Leg-Score + Legs im aktuellen Set + gewonnene Sets.

### Spinner-System
- `src/components/Spinner.tsx`: `<Spinner />` (inline, 18px) + `<PageSpinner />` (vollflächig, 32px). Loader2 mit `animate-spin` + Cherry-500. sr-only-Label aus `t("actions.loading")`.
- Alle vorherigen `Lade…`-Text-Stellen ersetzt: App.tsx, Dashboard, Profile, Stats, Parcours, TrainingDetail, TrainingSummary, ArrowEdit, BowEdit, ParcoursEdit/Detail/Lanes, TrainingArchive, Join, EmailSettings, ParcoursReviews, AddFriendModal, HighscoreCard, StationPhoto, NewTraining-Submit.

### SWR (Stale-While-Revalidate)
- `apiSWR()` in `src/api/client.ts`: cache-first, refresh-in-background via `onRefresh`-Callback. Bei fehlendem Cache identisch zu `apiCached`.
- 5 Listen-Endpoints umgestellt: `listTrainings`, `listBows`, `listArrows`, `listParcours`, `getStatsOverview`. Detail-Endpoints bleiben Network-First.
- N+1-Fix in `trainings_list` (Migration 0043): `done_targets` als Aggregat in einem Query statt N+1 via `participant_total()`.
- 2 Composite-Indizes: `trainings(user_id, archived_at, started_at)` + `training_participants(user_id, training_id)`.

### Notification-Prefs (Migration 0044)
- Granulare Toggles in `/profile#notifications`: 3 Kategorien (Sicherheit & Konto = locked, Soziales, Einladungen) × 2 Channels (In-App, E-Mail).
- Tabelle `notification_prefs(user_id, category, channel, enabled)` — fehlende Row = enabled (Default).
- `should_notify($uid, $cat, $ch)` in `api/lib/Notifications.php` als zentraler Helper. Aufgerufen in `friends.php` (Email-Versand) und `notify_create` (In-App).
- **DSGVO-Footer** in jeder Friend-Mail via `mail_footer_html()` mit signed 24h-JWT-Magic-Login-Link auf `/email-settings`. Endpoint `POST /auth/email-settings` tauscht den Magic-Token gegen ein 30-Tage-JWT.

### Aufnahme-Vokabular für target_practice
- Helper `endLabel(discipline, count, caps)` in `src/lib/format.ts`:
  - 3D / Field / Default → „Station" / „Stationen"
  - target_practice → „Aufnahme" / „Aufnahmen"
- Hierarchie laut User: **Set → Y Legs → X Aufnahmen → Z Pfeile**.
- Wizard-Felder: „Pfeile pro Aufnahme" + „Anzahl Aufnahmen" (statt „Durchgang").
- Hilfe-Seiten erweitert: HelpDisciplines (neue Sektion „Scheibenschießen"), HelpScoring (Hierarchie + 3 Wertungs-Varianten).

### Robustness gegen IONOS-504er + NetworkErrors
- `api()` in client.ts: bis zu **3 Versuche** mit 600/1200ms Backoff bei Network-Errors und HTTP 503/504. 4xx wird NICHT retryt.
- `AuthContext.refresh()`: bei 5xx/Network-Error nur Log und Cache aus `localStorage.archerries.me` als optimistischer User-State — **kein Logout mehr bei IONOS-Hängern**. Nur 401/403 räumt Token + Cache ab.
- Polling-Last halbiert: NotificationBell 30s → 90s, Live-Polling Sync-aware (5s sync / 10s collab+solo), Auto-Save Debounce 400ms → 1200ms.

### Dashboard + UI-Polish
- Trainings-Card: bei target_practice Metadaten-Zeile „3 Pfeile · 10 Aufnahmen · 18m · 10 Ringe · 2 Sets × 3 Legs" unter Disziplin+Bogen.
- Bei beendetem Training: Card-Footer „X Aufnahmen" (bzw. „X Stationen" für 3D) statt Sparkline (Sparkline mit 1-Value renderte einen verwirrenden orangenen Punkt — `Sparkline` returnt jetzt `null` bei < 2 Werten).
- Sidebar-Header: nur Wordmark (kein LogoMark mehr) für visuelle Ruhe.
- Custom-Action-Bar `inset-x-0` → `left-64 right-0` (Sidebar bleibt voll sichtbar).
- Tabellen-Header in StationsTable: `tracking-[0.08em] text-secondary/60 font-semibold` statt `text-muted` + `bg-surface` — premium-minimal.
- Beendetes Training: Tabelle als Default-View + alle Teilnehmer sichtbar; Friend/QR-Buttons ausgeblendet.

### Bug-Fixes
- **Erste-Pfeil-Bug im Sync**: KEY-FIX-`useEffect` in StationLiveEntry hatte `existing?.id` in deps. Bei Sync-Auto-Save pushte erster Pfeil → Polling-Refresh → `existing.id` ändert sich (war null, jetzt int) → useEffect re-initialisierte `zonesPicked` aus shots → erster Slot war wieder „leer" → Pfeil musste doppelt gesetzt werden. **Fix**: `existing?.id` aus deps raus — re-init nur bei echtem Kontext-Wechsel (stationIndex / scoringForPid).
- **Sync nicht-mein-Turn-Mirror**: separater `useEffect` mit `existingShotsSig`-Signature, der bei `!isMyTurn` das Pad passiv aus `existing.shots` rendert — Gegner sieht meine gespeicherten Marker.
- **DartsStandings**: Bedingung von `scoringParticipants.length >= 2` auf `allParticipants.filter(p => p.role !== "viewer").length >= 2` umgestellt (sonst unsichtbar im Sync, weil `scoringParticipants` nur den Turn-Inhaber enthält).
- **Auto-Close bei `ended_at`**: entfernt — User soll nach Training-Ende noch korrigieren können.

### Memory-Sync-Konvention
`.claude-memory/` im Repo = Git-Snapshot, Multi-Rechner-Sync via Push/Pull:
- **"memory laden"** = `.claude-memory/*.md` (außer README) → `C:\Users\<USER>\.claude\projects\C--Git-projects-appArcherries\memory\`
- **"memory exportieren"** = lokal → `.claude-memory/`, dann commit+push.
- README im Snapshot-Ordner wird beim Import NICHT übernommen.



## Live-Status — alle Features seit der letzten Memory-Aktualisierung

### Equipment (Bögen + Pfeile)
- **EquipmentTabs** Tab-Switcher Bögen↔Pfeile auf beiden Listen
- **Pfeil-Sets** mit M:N-Verknüpfung zu Bögen (Migration 0030, 0031), Spine, GPI, Befiederung, Nocken, Spitzen, Bestand
- **Bogen-Specs** erweitert: length_inch, brace_height, let_off_percent (Migration 0032)
- **Such-Feld + Sort-Dropdown** in beiden Listen, Arrows mit "nur defekte"-Toggle
- **Cross-Links** zwischen BowEdit ↔ ArrowEdit (direkt unter M:N-Chip-Auswahl)
- **Shop-Links**: arrows.purchase_url + ExternalLink-Icon auf Karten (Migration 0033)
- **Arrow-Events** (Migration 0034): defekt/verloren/nachgekauft/repariert pro Set mit Anzahl/Datum/Notiz, Auto-Aggregat-Updates auf count_broken/lost/total
- **Profi-Modus per Pfeil-Set** (Migration 0036, später Refactor von users.pro_mode auf arrows.pro_mode): Toggle direkt im ArrowEdit. AUS = nur Basics, AN = zusätzlich Schaft-Material/Durchmesser/GPI, Befiederung, Nocken, Spitzen, 4 Komponenten-Shop-Links

### Freundschafts-System (Phase 1 + 2)
- **Migration 0037**: `friendships(requester_id, recipient_id, status['pending','accepted','blocked'], requested_at, responded_at)`, UNIQUE-Key, FK CASCADE
- **Backend** `routes/friends.php`: GET /friends (4 Listen), POST /friends/requests (email-only), PATCH /friends/<id> (accept/reject/block), DELETE /friends/<id>
- **POST /friends/requests** sendet Email-Notif an Empfänger (PHPMailer). PATCH accept/reject sendet Email an Anfrager. Block sendet KEINE Email.
- **Block-Re-Anfrage**: 403 mit personalisierter Message "<X> möchte keine weiteren Anfragen von dir empfangen" (beide Richtungen)
- **Frontend** `/friends`-Page: Incoming (Accept/Reject/Block-Icons), Add-Form (E-Mail-Input), Friends-Liste, Outgoing-pending, Blocked-Section
- **Confirm-Dialogs** mit personalisierten Texten vor Reject/Block/Entfernen/Zurückziehen/Aufheben
- **Phase 2: 1-Tap-Add zu Training**: POST /trainings/<id>/participants {user_id}, validiert akzeptierte Freundschaft (beide Richtungen), AddFriendModal im TrainingDetail (Cherry-Button "Freund" + dashed "QR" für Token-Link)
- **Highscore-Filter** ?friends_only=1 — HighscoreCard hat Tabs "Global" / "Freunde"

### Notification-Center
- **Migration 0038**: `notifications(user_id, kind, payload JSON, read_at, created_at)` mit zwei Indizes
- **Backend** `routes/notifications.php`: GET (mit unread_count), PATCH read, POST mark-all-read, DELETE. Helper `notify_create($user_id, $kind, $payload)` aus friends.php + trainings.php
- **Notification-Kinds**: friend_request_received, friend_request_accepted, friend_request_rejected, training_friend_added
- **NotificationBell-Component** im Header (Mobile + Desktop-Sidebar): Cherry-Badge mit Anzahl ("9+" bei >9), 30s-Polling bei Tab sichtbar (pause bei hidden), Popover mit Icons je Kind, Klick markiert read + navigiert zur passenden Route
- **Smarte Anker-Positionierung**: `align="right"` (Mobile rechts), `align="left"` (Desktop links). Sonst hängt das Popover off-screen.
- **Dashboard-Banner** für offene Freundes-Anfragen + **Profile-Card-Badge** mit "X NEUE ANFRAGE(N)"-Label

### Parcours-Bahnen-Integration (NEUSTE WELLE)
- **parcours_serialize** liefert `lanes_detailed_count` — Aggregat aus parcours_lanes
- **ParcoursForm** zeigt im Edit unter "Anzahl Bahnen" Hinweis "X von Y detailliert erfasst — Bahnen verwalten" (Link zu /lanes)
- **trainings_create generiert Stations vor**: wenn Parcours `parcours_lanes`-Datensätze hat, werden alle als `training_targets` mit animal_or_face + distance_m (passend zum gewählten Pflock) angelegt. Discipline `simple` bypassed.
- **start_lane** (optional, default 1) rotiert die Reihenfolge: ab start, dann wrap-around. NewTraining-Wizard zeigt "Startbahn"-Picker wenn lanes_detailed_count ≥ 2.
- **Station-Grid in TrainingDetail** zeigt parcours.lanes_count statt hardcoded 28 — wenn Parcours zugeordnet. Beide Aufrufstellen (Übersichts-Grid + Bottom-Sheet) und Live-Entry-Header. Backend: trainings_detail liefert parcours_lanes_count.

### Logo + Branding (UI-Refresh)
- **schriftzug.svg** themable: alle Buchstaben fill:currentColor, roter i-Punkt fill:#7a2532 fix. Inline via ?raw + parent text-primary. Cherry bleibt im Dark-Mode rot statt invert→cyan.
- **Logo-Varianten als Assets**: logo_light/dark.svg (Mark only) + log_schriftzug_light/dark.svg (Mark + Schriftzug). Theme-Switch via hidden dark:block statt invert.
- **AppIcon**: appIcon.svg → 5 PNG-Größen via scripts/render-app-icons.mjs (Playwright-Chromium-Render): favicon-32, apple-touch-180, pwa-192/512/maskable-512 mit 12% Safe-Zone-Padding
- **iOS-Touch-Icon-Cache-Bust**: Vite-Plugin transformIndexHtml hängt ?v=<git-hash> an die Icon-Hrefs nach jedem Build. .htaccess setzt Cache-Control max-age=3600 + must-revalidate für PWA-Icons.

### Tageszeit-Anzeige
- **Berlin-Zeit im Build-Tag**: Intl.DateTimeFormat mit timeZone="Europe/Berlin", `__APP_BUILT__` ist volle ISO mit Z (vorher cut → Browser interpretierte als local-time → -2h Versatz)

### Sticky-Header-Fix
- **overflow-x: clip statt hidden** auf html/body — sticky bricht auf iOS Safari nicht mehr, Header bleibt beim Scroll

### Dark-Mode-Polish
- **Border-Hairlines weicher**: --border-hairline im Dark von 255 255 255 → 175 172 165 (warm-gray). Alle Card/Chip/Input-Outlines weniger grell.
- **Date-Picker-Icon sichtbar**: `html.dark { color-scheme: dark }` → native Form-Controls rendern in Dunkelvariante
- **Search-Cancel-X-Suppression**: input[type="search"]::-webkit-search-cancel-button hidden, sonst doppeltes X (browser-native + custom)

### Bug-Fixes / Wiederholungs-Stolperfallen
- BullseyePad-x/y-Capture wurde gebaut und **revertet** (Heatmap-Thema kommt später) — siehe Commit d9e4946
- StationHeatmap-Component **revertet**

## Was live läuft (https://archerries.mossig.de)

### Auth & User
- Registrierung mit E-Mail-Verifizierung + Passwort-Reset (IONOS-SMTP)
- JWT-Login, /me-Endpoint mit `/me/avatar` für Upload/Delete
- User-Rollen: `admin`/`user`/`guest`. `password_hash` nullable für Gäste.
- **Avatar** (Migration 0017): runder 1:1-Crop via `react-easy-crop`, 1 MB JPEG. `/auth/login` liefert `avatar_url` mit.
- **2 Test-User** (Migrations 0022 + 0027): `claude-test@archerries.local` + `claude-test2@archerries.local` (beide `ClaudeTest_2026!` / `ClaudeTest2_2026!`).

### Trainings & Wertung
- Sieben Disziplinen (3d_wa, 3d_ifaa, 3d_ifaa_hunter, 3d_ifaa_animal, 3d_bowhunter, field_wa, field_ifaa) + simple
- **Highscore-Veröffentlichung** (Migration 0026): `trainings.published_to_highscore` Toggle in TrainingSummary. Score, display_name, Avatar, Bow-Type werden veröffentlicht. Privat: Notizen, Standort, einzelne Pfeile.
- Drei Stellen Sync-pflichtig bei Scoring-Änderungen: `api/lib/Scoring.php`, `src/lib/scoringPreview.ts`, `previewArrowPoints()` in `TrainingDetail.tsx`.

### Parcours
- Migration 0020: erweiterte Stammdaten (lanes_count, price_info, opening_hours, …)
- **Öffentlich/Privat-Flag**: andere User sehen `is_public=1`-Parcours, können sie als Vorlage klonen, dort Trainings durchführen, Bewertungen schreiben, Highscores ansehen.
- Ownership-Check im Frontend: Non-Owner sehen "Bahnen ansehen" (read-only) statt "Bahnen verwalten". Bearbeiten + Löschen + Foto-Upload nur für Owner.
- Backend: `parcours_lanes.php` differenziert zwischen `owner` (alle Methoden) und `public` (nur GET).

### Bahnen pro Parcours (Migration 0021)
- Tabelle `parcours_lanes`: lane_number, animal_description, 4 Distanzen je Pflockfarbe, notes, image_path, sort_order
- Backend `api/routes/parcours_lanes.php` mit CRUD + Foto-Upload + Reorder
- Frontend `src/pages/ParcoursLanes.tsx` mit Inline-Editor, Up/Down-Swap, Mobile-Kamera, Image-Zoom-Modal
- Read-only-View für Non-Owners (LaneRow `readOnly`-Prop)

### Reviews (Migration 0024)
- Tabelle `parcours_reviews` (1 Review pro User pro Parcours, UNIQUE)
- Backend `api/routes/parcours_reviews.php`: GET/POST/DELETE
- Frontend `src/components/ParcoursReviews.tsx`: Star-Picker, Kommentar-Textarea, Liste anderer Reviews mit Avatar
- Aggregate (`avg_rating`, `review_count`) auf `parcours_serialize` — angezeigt im Parcours-Header (Cherry-Stern + "4.5 (2)") und in Parcours-Liste
- Datenschutz: nicht anonym — User sieht display_name + avatar des Reviewers

### Vorlage übernehmen (Clone)
- Backend `POST /parcours/<id>/clone` kopiert Stammdaten + Bahnen (Distanzen, Notes, Tier-Description) atomisch in transaction
- Bilder werden NICHT mitkopiert (User soll bewusst eigene Fotos machen)
- Geklonter Parcours startet als `is_public=0`
- Frontend: Dropdown-Selector in NewParcours zeigt eigene + öffentliche Parcours als Vorlage

### Favoriten (Migration 0025)
- Tabelle `user_favorites` mit kind ENUM('discipline','parcours','bow_type'), ref VARCHAR(64)
- Backend `api/routes/favorites.php`: GET, POST, DELETE
- Frontend `src/components/FavoriteButton.tsx`: Stern-Toggle mit Optimistic-Update
- WICHTIG: Prop heißt `refValue` (nicht `ref` — das ist in React reserviert!)
- Eingebunden: Parcours-Liste (absolute top-right corner), Parcours-Detail (Header), in NewTraining-Disziplin-Cards (TODO)

### Highscore-System (Migration 0026)
- Backend `api/routes/highscore.php`: GET /highscore?parcours_id=&discipline=&bow_type=&limit=3
- Score wird serverseitig aus shots berechnet wenn `summary_score IS NULL` — re-uses `compute_training_total()` aus Scoring.php
- Filtert: `published_to_highscore=1` + Score > 0
- Aggregate-Variante (ohne discipline-Filter) gruppiert nach (discipline, bow_type)
- Frontend `src/components/HighscoreCard.tsx`: Top-3 pro Gruppe mit Medaillen-Icon, Avatar, display_name, Score
- Eingebunden in ParcoursDetail

### PWA + Reload-Signal (umgestellt 2026-05-14)
- **`registerType: "prompt"`** — User sieht nach Deploy einen sichtbaren Cherry-Banner oben "Neue Version verfügbar — Jetzt" mit Reload-Button
- `skipWaiting`/`clientsClaim` NICHT mehr im Workbox-Config (vorher true) — der neue SW wartet, bis der User auf "Jetzt" klickt
- index.html + sw.js + manifest haben `Cache-Control: no-cache` (`public/.htaccess`), gehashte Vite-Assets sind `immutable`
- Reload-Button auch im NetworkStatus-Popover für Offline-Standalone-PWA

### Build-Revision im Header (2026-05-14)
- `vite.config.ts` injiziert `__APP_REV__` (`git rev-parse --short HEAD`) und `__APP_BUILT__` (ISO-Timestamp) als globale Konstanten
- `src/vite-env.d.ts` deklariert die Globals für TypeScript
- Layout zeigt `v<hash>`-Pille neben Wordmark (Mobile) und vollständig `v<hash> · <built>` in der Sidebar (Desktop)
- User sieht sofort, ob die App auf dem aktuellen Stand ist

### UIUX-Sweep (automatisiert)
- `tests/e2e/uiux-sweep.mjs`: Light + Dark, Mobile + Desktop, alle Hauptseiten
- Automatische WCAG-AA-Kontrast-Checks (4.5 für body, 3 für large) und Overlap-Detection
- Findings nach jedem Lauf in `test-report/UIUX_SWEEP.md`
- Aktueller Stand: 2 low-contrast (mobile-dark "Gefahrenzone" knapp 3.93/4.5 — bewusst akzeptiert) + 2 false-positives (Build-Tag Playwright-Selector findet das Element nicht, ist aber sichtbar im Screenshot)
- Globaler Dark-Mode-Cherry-Lift: `html.dark .text-cherry-500` → `#B46A76` (cherry-300), `text-cherry-700` → `#D89DA6` (cherry-200) — fixt alle Cherry-Text-auf-Canvas-dark-Issues auf einen Schlag (war Kontrast 1.09 bis 2.31 bei Footer-Nav "Karte"/"Logout"/"Öffentliche Parcours")
- `text-muted` von rgb(120) → rgb(95) lifted für Light, von 150 → 175 für Dark → durchgehend WCAG-AA auf canvas + elevated

### Hilfe-System
- 10 Sections (war 9): Erste Schritte, App installieren, Gemeinsame Runden, **Community (neu)**, Disziplinen, Wertungssysteme, Pflöcke, Bogenklassen, Glossar, Über die App
- Neue Section `HelpCommunity` erklärt: öffentliche Parcours, Reviews, Clone, Highscore, Favoriten, Datenschutz-Hinweis
- DE+EN locale-Keys synchron

### Stations-Live-Eingabe (Mai 2026)
- Footer-Nav versteckt während Eingabe (`usePageFooter([])`)
- BullseyePad-Inversion gefixt (innerstes Ring = höchster Wert)
- Kompaktes Mobile-Layout passt iPhone 14 Pro ohne Scroll

## DB-Schema (Stand: 27 Migrationen)

```
users (id, email, password_hash NULL, display_name, avatar_path NULL, status, role, ts)
parcours (id, user_id, name, …, is_public, lanes_count, peg_blue/red/yellow/white, difficulty, …)
parcours_lanes (id, parcours_id, lane_number, animal_description, 4× distance_<color>, notes, image_path, sort_order)
parcours_reviews (id, parcours_id, user_id, rating, comment, ts) UNIQUE (parcours_id, user_id)
user_favorites (id, user_id, kind, ref, created_at) UNIQUE (user_id, kind, ref)
bows (id, user_id, name, bow_type, …, is_default)
trainings (id, user_id, parcours_id?, …, discipline ENUM(8), nfaa_mode, bow_type, published_to_highscore, …)
training_participants (id, training_id, user_id, role[owner/scorer/viewer])
training_invitations (id, training_id, token, …)
training_targets (id, training_id, participant_id, target_index, …, image_path?)
shots (id, target_id, arrow_seq, zone?, points, x_norm?, y_norm?)
schema_migrations
```

## API-Endpoints (neu seit letztem Status)

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| GET    | `/api/index.php/parcours/<id>/reviews`        | JWT | Reviews-Liste |
| POST   | `/api/index.php/parcours/<id>/reviews`        | JWT | Eigenes Review upserten |
| DELETE | `/api/index.php/parcours/<id>/reviews/<rid>`  | JWT | Eigenes Review löschen |
| POST   | `/api/index.php/parcours/<id>/clone`          | JWT | Parcours + Bahnen klonen |
| GET    | `/api/index.php/favorites`                    | JWT | Eigene Favoriten |
| POST   | `/api/index.php/favorites`                    | JWT | `{ kind, ref }` setzen |
| DELETE | `/api/index.php/favorites?kind=&ref=`         | JWT | Entfernen |
| GET    | `/api/index.php/highscore?parcours_id=&…`     | JWT | Top-N pro Gruppe |
| PATCH  | `/api/index.php/trainings/<id>` `{ published_to_highscore }` | JWT | Score veröffentlichen |

## Tests

`tests/e2e/`-Verzeichnis:

| Suite | Was | Status |
|---|---|---|
| `smoke.mjs` | Erste Light-Variante | grün |
| `comprehensive.mjs` | Alle Pages Mobile+Desktop | 40/40 grün |
| `training-flow.mjs` | Alle 7 Disziplinen Center-Klick | 7/7 grün |
| `avatar-flow.mjs` | Avatar Upload+Anzeige | grün (DELETE-Cleanup 500 sporadisch) |
| `community-flow.mjs` | Cross-User: Review + Clone + Highscore + 403-Enforcement | 18/18 grün |
| `ui-review.mjs` | Setup-Daten + Screenshots der Features | grün |
| `cleanup.mjs` | Löscht E2E-Artefakte | grün |
| `debug-hunter.mjs` | API-Probe für Disziplin-Debugging | grün |

Screenshots: `test-report/screenshots/{mobile,desktop,training-flow,community-flow,features/{mobile,desktop},avatar}`.

## Deploy + Migrationen

`deploy.bat` → WinSCP-Sync → `curl POST /api/migrate.php -H "X-Migrate-Secret: <SECRET>"`. **Migrate-Secret:** `b6ae4602a0b0418fb79fc8eb81fd97d184c034bd9a9e0c1ffed6c0aab450f7d0`.

**Sehr WICHTIG:** `public/.htaccess` ist Source-of-Truth für die SPA. Vite kopiert das bei jedem Build nach `dist/.htaccess` — Edits direkt in dist werden überschrieben!

## Offene Threads (Stand 18.05.2026)

- **PWA-Cache zuverlässig**: autoUpdate + skipWaiting + clientsClaim, plus
  controllerchange → window.location.reload(), plus localStorage-rev-check.
  index.html hat zusätzlich meta http-equiv Cache-Control no-cache als Fallback
  für Proxies, die HTTP-Header ignorieren. ✅
- **Desktop Custom-Actions**: Layout rendert die customActions zusätzlich als
  sticky Bottom-Toolbar (hidden lg:block) — der Bahnen-Button + Trainieren etc.
  sind nun auf Desktop sichtbar (vorher fehlten alle). ✅
- **Bahn-Foto bei Neuanlage**: nach erstem Save bleibt der Editor offen mit
  existingLane gesetzt → Foto-Upload-Section erscheint. Hinweis-Text im
  New-Modus erklärt die Reihenfolge. ✅
- **Equipment-Loadout (FK trainings.bow_id)**: Migration 0028, bow_name in
  Training-Detail + Liste, NewTraining sendet bow_id. ✅
- **Stats Auto-Refresh nach Sync**: useSyncListener in Stats.tsx. ✅
- **Logo nachreichen** — PWA-Icons in public/pwa-*.png sind noch Placeholder.
- **Heatmap pro Station**: Schema bereit (shots.x_norm/y_norm), Frontend
  aggregiert noch nicht über mehrere Trainings.
- **Material-Tracking** (Pfeile/Sehnen/Spitzen) — Feature offen.
- **Offline-Foto-Upload** — Bild-Uploads sind weiter online-only.
- **Admin-UI** — offen.
- **Equipment-Loadout pro Training**: FK `trainings.bow_id` für Stats-Filter pro einzelnem Bogen.
- **Material-Tracking, Heatmap, Offline-Foto-Upload** wie bisher.

## Stolperfallen (kassiert, nicht nochmal!)

1. **IONOS schluckt `/api/<route>`-Rewrites** → `/api/index.php/<route>` + PATH_INFO
2. **IONOS strippt Authorization-Header** → `RewriteRule ^ - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` in api/.htaccess
3. **`!` im FTP-Passwort** → `setlocal DisableDelayedExpansion` in deploy.bat + URL-Encoding
4. **`.env.deploy.cmd`** braucht CRLF + `.cmd`-Endung
5. **MySQL implicit COMMIT bei DDL** → migrate.php ohne Transaktion
6. **WinSCP synchronize skipt Dotfiles bei gleicher Mtime** → `.htaccess` separat `put -nopermissions`
7. **WinSCP `synchronize remote -delete`** würde `/.env` und `/api` killen → kein `-delete`
8. **Browser cached altes Vite-Bundle** → `registerType: "prompt"` + no-cache-Headers für index.html + sw.js
9. **npm install ERESOLVE / SSL** → `--strict-ssl=false --legacy-peer-deps`
10. **Git SSL** → `git config http.sslBackend schannel`
11. **Recharts braucht `react-is`** als peer-dep
12. **iOS Safari + PWA**: SW nur über HTTPS oder localhost
13. **iOS-Notch verdeckt Top-Banner** im PWA-Standalone-Mode
14. **`password_hash NOT NULL`** verhinderte Gast-User-Anlage (Migration 0013)
15. **TypeScript `String.replaceAll`** braucht Lib `ES2021+`
16. **`globPatterns` in vite-plugin-pwa** muss `woff2` enthalten
17. **3D-Bowhunter hat 3 Pfeile, nicht 4**
18. **Optimistic-Target-Builder muss alle Target-Felder setzen** bei Schema-Erweiterungen
19. **Binär-Uploads gehen nicht durch Outbox**
20. **`public/.htaccess` ist Source-of-Truth** — Vite kopiert es nach dist/.htaccess beim Build
21. **`button` in `<form>` ohne explizites `type="submit"`** → Playwright-Selector `button[type="submit"]` matched nicht → `form.requestSubmit()` via `page.evaluate`
22. **BullseyePad-Ringe-Richtung**: rings-Array ist "von INNEN nach AUSSEN" — Radius muss `minR + idx * step` sein
23. **Production-DB von extern NICHT erreichbar** (IONOS Shared) — Migrationen IMMER via `migrate.php` + Migrate-Secret
24. **Vite-Proxy `/api` zeigt auf Production** — `npm run dev` läuft gegen Live-Daten
25. **Migration 0018 enthielt `TRUNCATE`** auf trainings — applied seit ~12.05, also Geschichte
26. **MySQL ENUM-Spalten silent-truncate auf `""`** bei unbekannten Werten (non-strict mode). Bei jedem ENUM-Schema-Update prüfen, dass Backend-Code, Frontend-Types und ENUM-Definition synchron sind. Wir hatten das mit `discipline`-ENUM → Migration 0023.
27. **`ref` als React-Prop-Name ist reserviert** — wird als DOM-Ref interpretiert und nicht an die Komponente weitergegeben. Bei FavoriteButton.tsx → `refValue` nutzen. Symptom: Seite rendert leer ohne JS-Error im Console, weil der Component undefined als ref bekommt.
28. **Deutsche Typo-Quotes „..." in JSX-Attributen** — das geschlossene `"` nach `Hannover` beendet den JSX-String-Prop vorzeitig, dann werfen `)` und das echte `"` `TS1003` / `TS1382`. Lösung: JSX-Expression-Container nutzen (`placeholder={"Notiz mit „Quote""}`) oder Single-Quote-Attribute (`placeholder='...mit "Zitat"...'`). Lieber innerhalb JSX-Attribute keine Typo-Quotes mischen.
29. **`input[type="search"]` rendert natives Clear-X** — WebKit/Blink zeigt ein eigenes `::-webkit-search-cancel-button`, das *zusätzlich* zu unseren custom Clear-Buttons erscheint. Sichtbar als zwei X nebeneinander auf Bows/Arrows/Parcours/Help. Global suppress in `src/styles/index.css` via `input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; }`. Beim Hinzufügen neuer Search-Inputs daran denken, dass das natürliche Verhalten genau dieses Doppel-X ist.
30. **Playwright `fullPage` screenshot + `position: fixed` Sticky-Toolbars** — fixed-Elemente werden im fullPage-Shot EINMAL an ihrer initial-viewport-position gerendert. Sieht im Screenshot aus, als überlappe die Sticky-Toolbar Form-Felder in der Page-Mitte, ist aber kein realer UI-Bug — live klebt sie immer am Viewport-Bottom. Bei Overlap-Befunden im fullPage-Bild zweite Verifikation mit non-fullPage-Shot machen, bevor man "fixt".

## Stack-Entscheidungen

- **PWA**: `registerType: "prompt"` + clientsClaim/skipWaiting FALSE → User sieht Banner + entscheidet bewusst
- **Cache-Headers**: index.html + sw.js no-cache, gehashte Assets immutable
- **Multi-User-Permissions**: Backend differenziert zwischen `owner`/`public`-Zugriff; Frontend zeigt ownership-aware UI (read-only-Buttons vs. edit-Buttons)
- **Reviews-Datenschutz**: nicht anonym (display_name + avatar sichtbar). In Hilfe erklärt.
- **Highscore-Datenschutz**: Opt-In via Toggle in TrainingSummary. Score + Bow + display_name werden veröffentlicht, Notes/Standort/Pfeile bleiben privat.
- **Klon**: Bilder werden NICHT mitkopiert (Speicher schonen + Original-Owner-Attribution erhalten).

## Wartung dieses Memos

- Am Ende jeder Session: Live-Status + neue Stolperfallen.
- Stolperfallen-Sektion: nur Sachen, die EINMAL gelernt wurden und nicht wieder ableitbar sind.
