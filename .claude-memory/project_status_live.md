---
name: appArcherries — aktueller Live-Status & nächste Schritte
description: Was steht, was läuft, was noch offen ist. Wird am Ende jeder Session aktualisiert.
type: project
originSessionId: 791df5d4-2800-4b75-8e19-816a5c3b7e18
---
**Letzte Aktualisierung:** 2026-05-26 (Toast-System + Mood-Tag + Monatliche Leaderboards)

## Session 2026-05-26 — Achievement-Toasts + Mood + Leaderboards

Drei Features in einer Iteration.

### Toast-System (`src/components/Toast.tsx`)
Minimaler Context-Provider mit Stack. Mobile: oben unter Header. Desktop: rechts unten. Auto-Dismiss 6s, klickbarer `href` möglich, 3 Varianten (default/success/cherry). Eingebunden in `main.tsx` direkt unter `ConfirmProvider`.

### Achievement-Watcher (`src/lib/useAchievementWatcher.ts`)
Hook im Layout: triggert nach App-Boot (3s delay) + nach jedem Sync-Drain einen `/me/achievements`-Call. Items mit `is_new=true` → Cherry-Toast „Neuer Erfolg: …" mit Icon + Desc + href=`/profile`. Set verhindert Doppel-Anzeigen pro Session. Backend setzt `is_new=true` nur für gerade-evaluierte Achievements — die App muss nichts tracken.

### Trainings-Tagebuch mit Mood-Tag (Migration 0059)
`trainings.mood VARCHAR(20) NULL`. Backend (`trainings.php`) hat das Feld in `create` (INSERT) und `update` (PATCH-Field-Liste) aufgenommen. Training-Type um `mood?: string|null`.

`TrainingSummary.tsx`: `MoodPicker`-Section direkt unter dem Score-Header. 5 Optionen mit Emojis: 🤩 Top-Lauf / 😊 Gut / 😐 Mittel / 😴 Müde / 😤 Frustriert. Click toggled (zweiter Klick = entfernen). Sofortiges `updateTraining()`.

`Dashboard.tsx::TrainingCard`: unter Location-Zeile Mood-Emoji + Label-Mini-Anzeige. Helpers `moodEmoji()` / `moodLabel()` mit Switch.

### Monatliche Leaderboards
`/highscore?period=month|year|all` — Backend (`highscore.php`) filtert `started_at >= NOW() - INTERVAL X DAYS`. Default `all`. Beim Aggregate-Modus (ohne discipline-Filter) wird die Period-Bedingung auch beim Group-Discovery angewendet, damit leere Period-Gruppen rausfliegen.

`HighscoreCard.tsx`: neue `PeriodBtn`-Pill-Bar (30 Tage / 365 Tage / Alle) unter dem Global/Friends-Toggle. Lädt bei Period-Wechsel neu. Empty-States pro Period mit Hinweis „schalte auf Alle".

`api/highscore.ts`: `listHighscores(parcoursId, friendsOnly, period)` mit `HighscorePeriod = "month"|"year"|"all"`.

## Session 2026-05-25 (Teil 2) — Was-ist-Neu-Banner

User-Feedback: viele neue Features sind nicht auffindbar — Sichtbarkeits-Problem.
Lösung: pro-User-Changelog im Dashboard.

**Migration 0058**: `users.last_changelog_seen TIMESTAMP NULL` — Marker bis zu welchem `released_at` der User die Items gesehen hat.

**Backend** (`api/lib/Changelog.php`): hardcoded `CHANGELOG_ITEMS`-Array mit 8 großen Features (key, released_at, icon, title, desc, link?). Endpoints:
- `GET /me/changelog` → filtert Items mit `released_at > last_changelog_seen`
- `POST /me/changelog/seen` → setzt `last_changelog_seen = NOW()`

**Frontend** (`src/components/ChangelogBanner.tsx`): Cherry-Card im Dashboard direkt unter dem Greeting. Sparkles-Icon + Item-Count + Liste der Sub-Cards mit Icon/Titel/Desc/Datum/optionalem Link (Hover-Pfeil-Animation). Zwei Dismiss-Wege: X-Button oder „Verstanden"-Button — beide POSTen `/me/changelog/seen`.

**Wartung**: Bei neuen Features einfach Eintrag in `CHANGELOG_ITEMS` ergänzen (im PHP). Kein DB-Update nötig — alle User mit `last_seen < neues_released_at` sehen es automatisch.

## Session 2026-05-25 — Sight-Marks-Calculator + Help-Polish

### Sight-Marks-Calculator (Migration 0057) — Killer-Feature für Visier-Schützen
Eines der Top-Differentiators aus der Wettbewerbs-Recherche. Pro Bogen
kann der User 2+ bekannte Visiermarken eintragen, die App interpoliert
quadratisch alle Zwischen-Distanzen.

**DB**: `bow_sight_marks` (id, bow_id, distance_m DECIMAL(5,2), mark_value DECIMAL(8,3), notes), UNIQUE auf (bow_id, distance_m), ON DELETE CASCADE.

**Backend** (`routes/bows.php`):
- `GET    /bows/<id>/sight-marks`
- `POST   /bows/<id>/sight-marks` (UNIQUE-Check → 409 bei Duplikat)
- `PATCH  /bows/<id>/sight-marks/<smid>`
- `DELETE /bows/<id>/sight-marks/<smid>`

**Frontend** (`src/components/BowSightMarks.tsx`):
- Eigene Section unter dem BowEdit-Formular (nur im Edit-Mode)
- Mathematik: 3+ Punkte = quadratische Least-Squares-Regression via 3×3 Gauss mit Pivotwahl + R²-Anzeige; 2 Punkte = lineare Interpolation; 1 Punkt = „mehr nötig"; 0 = nur Form
- Interpolierte Tabelle in 5m-Schritten von min−5 bis max+10m
- Eingegebene Distanzen werden cherry-tinted hervorgehoben („eingegeben") vs. „interpoliert"
- Nicht-5er-Distanzen (z.B. 18m, 22m) werden inline einsortiert
- Einheit ist beliebig (mm / Skalen-Schritte / Schraub-Umdrehungen — der Calculator skaliert linear)

**E2E-Test** (`tests/e2e/check-sight-marks.mjs`): 4 Szenarien (empty / single / linear / quadratic) × Desktop + Mobile = 8 Screenshots, verifiziert alle Layout- und Berechnungs-States.

### Help-Polish nach User-Feedback
- **HelpConversions Pill-Switch**: Live-Konverter und Umrechnungstabellen sind entweder/oder via PillButton-Bar (default: Konverter). Reduziert Section-Höhe ~50%.
- **Individuell-Disclaimer** klar in Statur-Tabelle UND Spine-Tabelle: „Das sind gängige Standardwerte. Zwei Schützen gleicher Größe können 2–3 Zoll auseinander liegen. Lass dich im Bogenladen ausmessen."
- **Spine-Tabelle korrigiert**: 12 Reihen von 10–15 lbs bis 65–70 lbs, fünf Pfeillängen-Spalten 22"–30". Sehr flexible Spines bis 1500 für Kinder/Jugend/leichte Bögen. Fehlende Kombinationen als „—".
- **Neue Sektion „Auszugslänge & Pfeillänge"** mit klarer Trennung tatsächlicher Auszug vs. AMO-Draw-Length (= tatsächlich + 1,75"). Drei Methoden zum Messen, Faustregel pro Bogentyp, Sicherheitshinweis „Pfeil darf nie hinter der Auflage liegen", korrigierte Statur-Tabelle (Erwachsene groß 185+ cm: Auszug 28–30" / Pfeil 29–31").
- **Konverter-Layout-Fix**: 2-Spalten-Grid → 1-Spalten + Inputs mit `w-0 min-w-0 flex-1` damit intrinsic-width nicht überläuft.
- **Externe Quellen/Links entfernt** (User-Wunsch): Hersteller-Charts-Links (Easton, Gold Tip, Victory, Bohning), „Inspiration: arrowforge.de"-Footer, „World Archery Book 4" / „IFAA Book of Rules" in HelpPegs.

### Admin-Email bei Registrierung
`api/lib/AdminNotify.php` mit `notify_superadmins()`, `notify_admin_new_registration()`. Bei Registrierung: alle aktiven Superadmins bekommen Mail mit User-ID, Name, E-Mail, Zeitpunkt + Profil-Link `/admin/users/<id>`.

Login-Mail wurde NICHT implementiert (User-Wunsch nach dem ersten Aufruf: „nur bei Registrierung"). Helper bleibt in der Lib für etwaige spätere selektive Nutzung.

## Session 2026-05-24 — Sichtbarkeits-Fixes: Trainings-Tabs + Mobile-Admin + Quick-Tiles + Umrechnungstabellen

## Session 2026-05-24 — User-Feedback umgesetzt

User-Kritik: „Verlinkungen fehlen, Trainings-Übersicht braucht Kategorie Beendet, Mobile-Menü kein Admin-Link, Playwright war oberflächlich". Konkrete Fixes:

### Trainings-Liste mit Tabs (Aktiv / Beendet / Archiv)
Dashboard.tsx zeigt jetzt drei Pills statt einer einzigen Mischliste:
- **Aktiv**: `ended_at IS NULL`
- **Beendet**: `ended_at != NULL && archived_at IS NULL`
- **Archiv**: lazy via `listTrainings(archived=true)` — separater API-Call, erst wenn Tab angetippt

Counts in jedem Tab-Chip. Empty-States pro Tab. Swipe-Aktion „Aus Archiv" rückt archivierte zurück.

### Mobile-Admin-Link
Layout-Mobile-Header zeigt für admin/superadmin ein Cherry-Shield-Icon zwischen NetworkStatus und NotificationBell. Tap = direkter Sprung zu `/admin`. Vorher war das nur über URL erreichbar.

### Dashboard-Quick-Tiles für neue Features
Drei sichtbare Cards direkt unter den Glimpse-Stats:
- 🔥 **Streak** → `/profile` (aktuelle Tag-Reihe)
- 📏 **Schätz-Training** → `/train/distance`
- 🏆 **Erfolge** → `/profile` (X / Y freigeschaltet)

Daten via lazy `/me/achievements`. Vorher waren diese Features nur tief versteckt erreichbar.

### Mobile-Admin: Card-Layout statt Tabelle
8-Spalten-Tabelle war auf 390px schwer lesbar (Spalten überlappen / abgeschnitten). Neue `lg:hidden`-Variante:
- Pro User eine Card mit Avatar + Name + Email + Role-Badge + Status-Pill + Counts-Zeile
- Sort-Dropdown statt Spalten-Klick-Header (Mobile-tauglich)
- Desktop-Tabelle (`hidden lg:block`) unverändert

### Gründlicher Playwright-Sweep (`tests/e2e/full-sweep.mjs`)
Migration 0056 promoted claude-test2 zum Admin für E2E-Tests. Sweep deckt 28 Pages × 4 Varianten = 112 Screenshots ab (mobile/desktop × light/dark). Sofort sichtbar: Tabellen-Overflow auf Mobile (war oben). Sauberer Workflow für künftige Layout-Checks.

### Umrechnungstabellen & Tools (`/help/conversions`)
User-Idee aus arrowforge.de übernommen + erweitert:
- **6 Live-Konverter** (bidirektional, sofort): Zoll↔mm, Grain↔g, Zoll↔cm, lbs↔kg, Yards↔m, Fuß↔m
- **5 statische Tabellen**: Zoll-Brüche, Grain, Zoll-Ganz, lbs, Yards mit Standardwerten
- **Pfeil-Spine-Orientierungsmatrix** (Zuggewicht × Pfeillänge) mit Disclaimer + Hersteller-Links
- Eingereiht in Help-Gruppe „Sport & Regelwerk" hinter Bogenklassen
- i18n DE+EN

## Session 2026-05-23 (Teil 4) — Wettbewerbs-Differentiator-Drop

## Session 2026-05-23 (Teil 4) — Wettbewerbs-Differentiator-Drop

User-Vorgabe: "Hyper gewissenhaft autonom arbeiten, andere Apps recherchieren, eigene Ideen einbringen, beste App auf dem Markt machen". Strategie:

1. Quick-Wins erst (Self-Delete, Empty-States, Performance-Audit)
2. Research per WebSearch (MyTargets, Artemis, ArcheryBuddy, Rise, ArcherySuccess, Archery Sight Mark, PRO Archery Ballistics, ArcherSense)
3. 3 differenzierende Features implementiert

### Recherchierte Wettbewerber-Features
- **AI-Form-Analyse via Video** (ArcheryBuddy, ArcherSense): zu komplex/teuer für V1
- **Sight-Marks-Calculator** mit quadratischer Interpolation (PRO Archery Ballistics, Archery Sight Mark): machbar, TODO
- **Streaks & Daily-Goals** (ArcheryBuddy, ArcherySuccess): ✅ heute gebaut
- **Achievements & XP** (Rise, Archery Score Tracker): ✅ heute gebaut
- **Wind-/Wetter-Korrektur** (PRO Archery Ballistics): teilweise via Wetter-Logger heute
- **Monatliche Leaderboards** (Rise): TODO

### Selbst implementierte Features (commit `e40f40a`, ` (siehe Distanzschätz + Achievements + Weather Commit)`)

**1. Self-Delete im Profile** (`DELETE /me` mit Password-Confirm)
   - Analog zur Admin-Variante, aber für sich selbst
   - Superadmin nicht selbst-löschbar (Lock-Out)
   - Modal mit Aufzählung was passiert + Password + Logout danach

**2. Empty-States verbessert**
   - Parcours-Liste: doppelt CTA (eigenen anlegen / öffentliche entdecken), Emoji-Header
   - Stats: "Erstes Training starten"-CTA wenn leer
   - Friends: erklärt Konzept + was Freunde tun können

**3. Achievements & Streaks (Migration 0055)**
   - `api/lib/Achievements.php` mit 18 Achievements
   - Kategorien: Erste Schritte, Volume (10/50/100), Vielfalt (alle 3D / alle Bows), Score (300/500), Social, Streaks (3/7/30 Tage)
   - Lazy-Evaluation bei `GET /me/achievements` — INSERT IGNORE für Race-Safety
   - `streak_current()` rückwärts von heute (max 90 Tage zurück)
   - Profile-Page: Streak-Card oben + Grid mit unlocked + collapsible details mit locked

**4. Distanzschätz-Trainings-Modus** (`/train/distance`)
   - Zufalls-Distanzen 5–45m, gauss-verteilt um 22m
   - Range-Slider + Schnellauswahl-Buttons
   - Feedback-Tone (perfekt/sehr gut/okay/daneben) + sportspezifische Erklärung
   - Personal-Stats lokal in LocalStorage (kein Server, kein PII)
   - Beste Serie (Streak unter 2m)
   - CTA-Banner auf Stats-Page verlinkt den Modus

**5. Wetter-Auto-Logger via Open-Meteo**
   - `src/lib/weather.ts`: fetchWeatherSnippet(lat, lng) → "23°C, leicht bewölkt · Wind 8 km/h SW"
   - Kein API-Key nötig (Open-Meteo kostenlos)
   - Beim Training-Submit in NewTraining mit Parcours lat/lng aufgerufen
   - Schreibt in existierende `trainings.weather`-Spalte
   - Robust: 5s-Timeout, Lazy-Import, Training-Erstellung läuft auch bei API-Fehler durch

### Was Archerries einzigartig macht (Stand jetzt)
- Vollständig offline-PWA mit Sync-Queue auch für Bilder
- Multi-Player-Live-Scoring per QR mit Gast-Accounts ohne Passwort
- Pad-basierte Heatmap getrennt von Foto-Markern
- Bahn-Foto-Galerie + Heatmap pro Parcours-Bahn
- Detailed equipment tracking (Pfeil-Set + Sehnen-Lifecycle + Events)
- Soft-Delete + DSGVO-Compliance + Admin mit Rollen
- Hilfeseite mit offiziellem Regelwerk + 5 Themengruppen
- Onboarding-Wizard (kurz/lang) mit Prefill und Abbrechen
- **Achievements + Streaks** (neu)
- **Lokales Distanzschätz-Training** (neu)
- **Automatischer Wetter-Logger** (neu)

### Open (für später)
- Sight-Marks-Calculator pro Bogen (mit quadratischer Regression)
- Monatliche Gruppen-Leaderboards
- Crowdsourced Bahn-Distanzen (anonyme Schätzungen)
- Verein/Mannschaft-Konzept
- Tournament-Bracket-Management (außerhalb V1-Scope)

## Session 2026-05-23 (Teil 3) — Drei in einem Sweep

## Session 2026-05-23 (Teil 3) — Drei in einem Sweep

### ParcoursEdit-Offline-Toast (letzter Endpoint ohne Pending-Feedback)
`ParcoursEdit` + `NewParcours` setzen `sessionStorage["parcours_photo_pending"] = id` wenn Foto-Upload in die Queue geht. `ParcoursDetail` liest beim Mount, zeigt Cherry-Banner „Foto wird hochgeladen, sobald online" + Schließen-X.

### Admin: Trainings-Show-More
Neuer paginierter Endpoint `GET /admin/users/:id/trainings?offset=&limit=` (Default offset=10, limit=20, max 100). `admin_user_detail` liefert weiter nur die ersten 10 als Vorschau + `count_trainings`. `AdminUserDetail.tsx` lädt 20er-Pakete lazy nach mit „Weitere N Trainings laden"-Button, zeigt am Ende „Alle X Trainings geladen".

### Soft-Delete statt Hard-Delete (Migration 0054)
`users.deleted_at TIMESTAMP NULL` + Index `idx_users_deleted`. `require_auth()` und `try_auth()` prüfen `deleted_at IS NULL` — soft-deleted können sich nicht mehr einloggen.

`admin_user_delete` macht jetzt UPDATE statt DELETE:
- `email` → `deleted-<id>-<ts>@deleted.local`
- `display_name` → `Gelöschter User #<id>`
- `password_hash` → NULL
- `avatar_path` → NULL (Datei vorher vom Server gelöscht)
- `status` → `pending`
- `deleted_at` → NOW()

Reviews, Friendships, geteilte Trainings, öffentliche Parcours BLEIBEN — werden als „Gelöschter User #<id>" gerendert. **DSGVO-konform**: PII raus, öffentliche Inhalte erhalten.

Filter in anderen Endpoints:
- `admin_users_list`: `WHERE deleted_at IS NULL` standardmäßig, `?include_deleted=1` zeigt auch gelöschte
- `friends_list`: filtert gelöschte „andere"-Seite
- `friends_request`: lehnt Anfragen an gelöschte ab
- `highscore_list`: filtert gelöschte aus

Frontend:
- `AdminUser` + `AdminUserDetail`-Types mit `deleted_at`
- `Admin.tsx`: Checkbox „Auch gelöschte zeigen" in Filter-Bar; Tabellenzeile für gelöschte: opacity-60, Trash2-Icon, „gelöscht"-Pill, italic Name, kein Online-Dot
- `AdminUserDetail.tsx`: Banner „Account gelöscht" mit Datum; Profile abgeschwächt; `canDelete()` lehnt bereits gelöschte ab
- Delete-Section: Text umgeschrieben („Anonymisieren" statt „Endgültig löschen"), Aufzählung was anonymisiert wird vs. was bleibt

### SVG-Refinements (siehe Teil 2 zuvor)
Wildschwein → Reh-Silhouette mit 4 Beinen, Hals, Kopf, Geweih, Schwanz. Bogen-Silhouetten detaillierter: Recurve mit Wurfarm-Tips + Visier + Stabi, Compound mit echten Cams + Scope, Barebow ohne Anbau, Langbogen mit Wicklung. User-Feedback: „nicht schön, ersetzen wir irgendwann durch PNG" — TODO für später.

## Session 2026-05-23 (Teil 2) — UX-Refinements aus User-Feedback

## Session 2026-05-23 (Teil 2) — UX-Refinements aus User-Feedback

### Admin-UI: Lesbarkeit
Schrift in Tabelle + Filter war zu klein. Body `text-sm` → `text-base`, Header `text-xs` → `text-sm` (kein uppercase + Tracking mehr für besseres Lesen). Padding `py-2/px-3` → `py-3/px-4`. Avatar in Tabelle von `sm` → `md`. RoleBadge `sm` von 10px auf 12px, `md` von 12px auf 14px (+ Icons proportional).

### Onboarding
- **Default = LONG-Modus**: `?mode=short` ist nur explicit-Override (vorher umgekehrt). Damit bekommt jeder neue Registrierte die ausführliche Tour.
- **X-Abbrechen** oben rechts: markiert Onboarding als abgeschlossen + redirect zur App. Sonst landet User im Loop.
- **Prefill aus DB**: Welcome lädt `listBows()` beim Mount; default-Bow füllt `bowType` + `bowName` vor. Beim Save: `updateBow(existingDefaultBowId, ...)` statt `createBow()` — vermeidet Duplikate bei Re-Run.
- **Multi-Select Interesse**: `Set<InterestKey>` statt single. „Alles ein bisschen" gestrichen, dafür Checkbox-Buttons.
- **Scroll-to-Top**: `useEffect([stepIdx])` mit `window.scrollTo` + `topRef.scrollIntoView`.
- **Profile-Buttons**: Ausführlich = `btn-accent` (default), Kurz = `btn-secondary`. Beschreibungen size up zu `text-sm`.

### Hilfeseite-Struktur
17 Sections sind in **5 Top-Level-Themengruppen** gegliedert:
- Einstieg & App (getting_started, install, offline_sync)
- Sport & Regelwerk (disciplines, scoring, pegs, bows)
- Community & Geteilte Runden (shared, community)
- Statistik & Fortgeschritten (stats, routines, power_user, equipment)
- Datenschutz, FAQ & Glossar (privacy, faq, glossary, app)

`Help.tsx` rendert pro Gruppe einen Header (Icon + Label + Description) + die zugehörigen Section-Akkordeons. Suchfilter funktioniert weiterhin sectionsweit (Gruppen ohne matches werden ausgeblendet).

### Verbände-Glossar
`HelpDisciplines` und `HelpScoring` haben jetzt am Top eine **card-sunken Verbände-Box**, die WA / DSB / IFAA / DFBV / NFAA / FITA auflöst. Der Glossar erscheint vor allen Disziplin-Beschreibungen — wer die Abkürzungen nicht kennt, sieht sie sofort.

### Cross-Reference Disziplinen → Wertungssysteme
Neuer `ScoringReference`-Banner als Link, **eine Ebene HÖHER** vor jedem Disziplin-Block (3D, Field, Scheibenschießen). Mit Pfeil-Icon und Hover-Animation. Anker: `/help/scoring#3d-wa-dsb`, `#feldbogen-wa-dsb`, `#scheibenschiessen`. Target-Sections haben `scroll-mt-24` für korrektes Scroll-Stop.

### Pflock-Standpunkt-Regeln nach offiziellem Regelwerk
War vorher: „Mit beiden Füßen am Pflock stehen. Eine Fußspitze sollte den Pflock direkt berühren." (slangig, technisch falsch). Jetzt drei verbandsspezifische card-sunken Blöcke:
- **WA/DSB (Book 4)**: Beide Füße auf gedachter Linie durch den Pflock
- **IFAA/DFBV**: Mindestens ein Fuß muss Pflock berühren oder direkt daneben aufliegen
- **Verstöße**: Schuss-Annullierung (= 0), Wiederholungs-DQ

Plus erweiterte Etikette (richtigen Pflock wählen, kein Distanz-Messen, Pfeile-erst-Ziehen, Abstand zur Schießlinie).

### Tests
`tests/e2e/responsive-audit.mjs` macht Screenshots der 10 wichtigsten Pages (Help-Sections + Welcome + Profile) auf Mobile + Desktop, Light + Dark. UIUX-Sweep zeigt 0 echte Findings (nur 2 false-positive für Build-Tag-Selector).

## Session 2026-05-23 — Admin-Polish + Online-Status

## Session 2026-05-23 — Admin-Polish + Online-Status

### Bug-Fix: `/admin/users/:id` warf 500
Friendship-Query nutzte `:uid` dreimal. PDO mit `ATTR_EMULATE_PREPARES=false` verbietet das (native MySQL Prepared Statements). Fix: positional `?` mit dreifachem Übergeben. **Wichtige Stolperfalle für die Liste**.

Bonus: `handle_admin()` wickelt jetzt alle admin-Endpoints in try-catch und gibt die echte Fehlermeldung an Admins zurück (nicht generisches "Server error"). Erleichtert Bug-Diagnose deutlich.

### NetworkStatus-Popover
War absolute `right-0`-positioniert → in Desktop-Sidebar links abgeschnitten. Neue `align="left|right"`-Prop, Sidebar nutzt `left`.

### Admin-UI komplett ausgebaut
- `RoleBadge` (`src/components/RoleBadge.tsx`): farbcodiert pro Rolle. Superadmin = Gold-Krone, Admin = Cherry-Schild, User = Neutral, Guest = muted-italic dashed.
- Filter-Bar: Search + Rolle-Pillen + Status-Pillen (Filter-Pillen sind opacity-gated klickbar).
- Sortierbare Tabelle: `ThSort`-Component mit auf/ab-Indikatoren in Cherry. Spalten: name/role/status/trainings/parcours/bows/created. ROLE_ORDER für stabile Rollen-Sortierung.
- Pagination: 25 pro Seite, First/Prev/Next/Last + Range-Anzeige ("1–25 von 47").
- `RoleInfoBox` collapsible: erklärt 4 Rollen + Schutzregeln + "Deine Rolle".

### Superadmin-Rolle (Migration 0052)
ENUM('superadmin','admin','user','guest'). markus@mossig.de auto auf superadmin. Schutzregeln:
- Superadmin > Admin > User/Guest
- Eigener Account nie änderbar (Lock-Out-Schutz)
- Promotion zu Superadmin nur durch Superadmin
- Mindestens ein aktiver Superadmin muss bleiben — `admin_ensure_superadmin_remains()` zentrale Prüfung
- Hard-Delete eines Superadmin hart gesperrt
- Admin kann keine Admins/Superadmins anfassen — `admin_can_modify()` zentraler Helper

### User-Detail-Page `/admin/users/:id`
Profile-Card mit Avatar + Online-Badge + Rolle-Badge + Status-Pill. 7 Count-Tiles. Aktionen (Role/Status). Hard-Delete-Bereich mit Email-confirm-Eingabe als Schutz. 7 Akkordeon-Listen: Trainings (Top 10), Parcours, Bögen, Pfeil-Sets, Equipment, Freunde (verlinkt), Reviews.

### Online-Status-Feature (Migration 0053 — users.last_seen_at)
Auth.php `require_auth()` schreibt `last_seen_at` throttled (max 1×/Min). Index auf `last_seen_at` für ggf. spätere "wer ist gerade online?"-Queries.

Frontend:
- `src/lib/presence.ts`: `isOnline(lastSeen)` mit 5-Min-Schwelle + `lastSeenLabel(lastSeen)` für de-DE-Anzeige.
- Avatar-Component bekommt `showPresence?`-Prop → grüner Online-Dot unten-rechts mit `border-canvas` Hairline. Proportional zur Avatar-Größe.
- Backend serialisiert `last_seen_at` in: me, admin_user_summary, admin_user_detail (user + friends), friends_list (FriendUser), trainings detail (Participant).
- Frontend zeigt Online-Dot in: Admin-Liste, AdminUserDetail (Header + Friends), Friends-Page (alle 4 Sektionen), AddFriendModal, ParticipantsBar (nur fremde Spieler).

### Help-Section-Erweiterung (von 11 auf 17)
6 neue Sektionen mit i18n-Keys:
- `stats` — Heatmap-Lesen, Pfeil-Konsistenz, Score-Verlauf, Highscore
- `offline_sync` — 3-Schichten-Modell, Status-Indikator, Sync-Badge, Konflikte, Installation
- `routines` — Hallen-Routinen, Distanzschätzung üben, Wettkampf-Vorbereitung
- `power_user` — Deep-Links, BullseyePad-Tricks, Foto-Marker, Multi-Player-Tricks, Polling-Pause
- `faq` — 13 häufige Fragen mit Aufklapp-Antworten
- `privacy` — Wo liegen Daten, wer sieht was (Tabelle), Admin-Sicht, Veröffentlichungs-Kontrollen, DSGVO

### Onboarding-Kurz/Lang-Modus
Welcome.tsx liest `?mode=short|long`. SHORT = 5 Setup-Steps. LONG = 11 Steps mit 7 didaktischen Lehr-Steps vorgeschaltet: App-Konzept, 3 Disziplin-Familien, Wertungs-Grundlagen, Pflöcke, Bogenklassen, Multi-Player, Statistik+Datenschutz.

Profile bietet 2 Buttons ("Kurze Tour" / "Ausführliche Einführung"), nutzt POST /me/onboarding/reset, navigiert mit ?mode-Param.

Long-Steps haben "Lehrstoff überspringen → direkt zum Setup"-Link für ungeduldige User.

### Eigene TODOs für später (User-Feedback abwarten)
- SVG-Illustrationen sind noch sehr abstrakt — User markierte für später als Refinement.
- AdminUserDetail Trainings-Liste auf 10 limitiert. Kein "Show more" — bei Power-Usern fehlt evtl. Übersicht.
- Hard-Delete kaskadiert auch Reviews/Friendships — andere User verlieren Inhalt. Soft-Delete (Anonymisierung) wäre alternativ.
- Last-Seen wird offline nicht aktualisiert → User in Funkloch erscheint als "vor 2 Std offline" obwohl er gerade was tut. Erst beim nächsten Sync wird's korrekt.



## Session 2026-05-21 — Resümee (10 Commits, alle live + gepusht)

| Commit | Was |
|---|---|
| `daa7a97` | Offline-Foto-Queue auf Bow/Arrow/Parcours/Lane (tryUploadOrQueue-Helper) |
| `a4122df` | Avatar offline (pendingAvatarUrl im AuthContext, merged via effectiveUser) |
| `2e7f114` | Multi-Player-Pad-Heatmap mit Farbcode + Legende |
| `5815023` | PhotoMarkers zeigt foreign Marker im collab-Mode |
| `207c9f7` | Admin-UI MVP (/admin, Role/Status-Toggle, Schutzregeln) |
| `2ec137f` | Memory-Snapshot 2026-05-21 |
| `a75e14a` | Memory-Session-Ende-Tabelle |
| `338441d` | Hilfeseite Rewrite mit SVG-Illustrationen (Disziplinen, Wertung, Pflöcke, Bogenklassen) |
| `5b808e1` | Onboarding-Wizard 5 Steps + Migration 0051 (users.onboarding_completed_at) |
| `a2aa9ea` | UI-Kontrast-Findings aus UIUX-Sweep behoben |

## Session 2026-05-21 (Teil 6+7) — Help-Seiten und Onboarding

### Neue Komponente `src/pages/help/HelpIllustrations.tsx`
Zentrale didaktische SVGs für die Hilfeseiten — kein Interaction, nur statische Diagramme:
- `AnimalTargetSVG` (3D-Wildschwein-Silhouette mit Inner Kill / Outer Kill / Wound + Beschriftungslinien)
- `WATargetSVG` (10er-Ring mit Beschriftung der Ringwerte)
- `FieldWATargetSVG` (Field-6er-Wertung, Gelb/Schwarz/Weiß)
- `FieldIFAATargetSVG` (5/4/3 Weiß/Schwarz)
- `PegStakeSVG` (farbiger Pflock-Kopf auf Holzpfahl)
- `RecurveBowSVG`, `CompoundBowSVG`, `BarebowSVG`, `TraditionalBowSVG` (stilisierte Silhouetten)
- `HelpIllustrationBox` (Wrapper für Illu + Caption + Inhalt nebeneinander)

### Help-Section-Rewrite
- **HelpDisciplines**: 3D / Feldbogen / Scheibenschießen / Halle, jeweils mit Illustration + verschachtelten Sub-Akkordeons (Wertungssysteme, Ablauf, Tipps für Anfänger).
- **HelpScoring**: pro 3D-System konkrete Rechenbeispiele (Bestcase, nach Miss, spät getroffen). Halle-Beispiel mit Maxwert. Sets-und-Legs-Match-Verlauf.
- **HelpPegs**: Distanz-Tabelle (min/max/typisch für) statt nur Text. Pflock-Etikette-Liste. Markiert vs. unmarkiert erklärt.
- **HelpBows**: 4 Cards mit Silhouette, Merkmalen, typischen Disziplinen, voreingestellter Pflockfarbe. "Welche Klasse passt zu mir"-FAQ.

### Onboarding-Wizard (`pages/Welcome.tsx`)
Migration 0051 fügt `users.onboarding_completed_at TIMESTAMP NULL` hinzu. Bestehende User werden bei der Migration als abgeschlossen markiert (so dass nur **neue Registrierungen** durchgehen).

5-Step-Wizard:
1. **Willkommen** — App-Pitch mit 4 Highlight-Cards (Disziplinen, Geteilte Runden, Statistiken, Highscores)
2. **Anzeigename** — Pflichtfeld, vorbelegt falls bei Registrierung gesetzt
3. **Bogenklasse** — 4 Karten mit Silhouette + Pflock-Hint + optionaler Bogen-Name
4. **Disziplin-Interesse** — 3D / Field / Target / Any (informativ)
5. **Done** — Übersicht + zwei CTAs: "Erstes Training" → `/trainings/new` oder "Erstmal umsehen" → `/`

Beim Submit werden parallel: display_name gepatched, default-Bogen via `createBow` angelegt, `POST /me/onboarding/complete` gerufen, `refresh()` lädt den User neu.

`App.tsx::RequireAuth` bekommt einen **Onboarding-Gate**: wenn `user.role !== "guest"` und `!user.onboarding_completed_at`, dann redirect auf `/welcome`. Die `/welcome`-Route selbst nutzt `<RequireAuth skipOnboardingGate>` damit sie sich rendern darf.

**Wie testen?** Neuen Account registrieren — der hat `onboarding_completed_at = NULL` und wird automatisch durch den Wizard gelotst.

### UI-Kontrast-Fixes (aus UIUX-Sweep)
- `text-forest-300` (alter Forest-Palette-Rest) auf "Pkt"-Suffix in Dashboard → `text-muted` (war 2.37 Kontrast)
- "Geteilt"-Badge in Dashboard: explizites `dark:text-copper-200` (war 1.6 Kontrast im Dark)
- "Gefahrenzone"-H2 in Profile: `text-cherry-700 dark:text-cherry-200` (war 3.93 unter WCAG-AA Schwelle)

## Session 2026-05-21 (Teil 5) — Admin-UI MVP

## Session 2026-05-21 (Teil 5) — Admin-UI MVP

**Backend** `api/routes/admin.php` mit `handle_admin($method, $path)`:
- `GET /admin/users` — Liste aller User mit Aggregaten (count_trainings, count_parcours, count_bows) via Subqueries
- `PATCH /admin/users/<id>` `{role?, status?}` — Schutzregeln:
  - Self-Demote-/Self-Deactivate-Schutz: User kann sich nicht selbst aussperren
  - Letzten-Admin-Schutz: `count(role='admin' AND status='active') > 1` muss bleiben, sonst 400

`api/index.php` Route-Dispatcher um `/admin/` erweitert.

**Frontend** `pages/Admin.tsx`:
- Tabelle mit Avatar, Name, Email, Role-Dropdown, Status-Pill, Count-Spalten
- Search-Input filtert Email + Display-Name
- Eigene Zeile: Role/Status disabled mit Hover-Tooltip
- Redirect bei non-admin (UX-Backup, Backend würde sowieso 403)

`Layout.tsx` Sidebar: `<SidebarLink to="/admin">` nur sichtbar wenn `user.role === "admin"`. Mobile-Floating-Nav hat keinen Admin-Link — Admin ist desktop-orientiert (Tabelle).

`App.tsx`: `/admin` als lazy-Route. `src/api/admin.ts` mit `listAdminUsers` + `updateAdminUser`.

## Session 2026-05-21 (Teil 4) — Foreign Marker auf Stations-Foto

`PhotoMarkers` (Stations-Foto im 3D/Field-Live-Entry) nimmt jetzt optional `foreignMarkers?: ForeignMarker[]`. Read-only Punkte mit Spieler-Farbe + Initial, ohne Click-Handler, gerendert UNTER den eigenen Markern (eigene haben Hit-Target-Priorität).

In TrainingDetail wird `computeForeignMarkers(training, stationIndex, myPid)` (existierte schon für TargetPad target_practice) auch an PhotoMarkers durchgereicht — wenn `isCollabMode` aktiv ist und andere Spieler bereits Foto-Marker für die aktuelle Station gesetzt haben, sieht der eigene Live-Score deren Treffer mit.

**Konzeptuelle Annahme**: alle Participants teilen die gleiche Foto-Geometrie. In der Praxis macht meist der Score-Owner das Foto, alle markieren darauf. Wenn Spieler unterschiedliche eigene Fotos hochgeladen haben, sind die foreign-Markers visuell auf dem fremden Foto positioniert — Edge-Case, in der UI nicht abgefangen.

## Session 2026-05-21 (Teil 3) — Multi-Player Pad-Heatmap

`Heatmap`-Component bekommt optionalen `color?: string` pro Punkt. Default-Verhalten unverändert (Cherry mit Alpha 0.35); bei explizit gesetzter Farbe wird Alpha auf 0.7 erhöht, damit Spieler-Farben nicht zur dunklen Suppe matschen.

`OwnPadHeatmap` umbenannt zu `ParticipantsPadHeatmap` in TrainingSummary. Iteriert alle scoring-Participants (filter role !== "viewer"), Farben aus `HEATMAP_COLORS` (gleicher Palette wie ParticipantsHeatmap für target_practice). Legende mit Spielername + Anzahl + Score-Total wenn ≥2 Spieler; bei Solo bleibt's wie bisher (1 Farbe, simple "X Pfeile"-Footer).

Fallback: wenn `training.participants` leer ist (alte cached Trainings), alle pad-Treffer mit Default-Farbe rendern.

## Session 2026-05-21 (Teil 2) — Avatar offline

`AvatarUploader` nutzt jetzt `tryUploadOrQueue`. Bei pending wird `setPendingAvatar(blobUrl)` im `AuthContext` aufgerufen — der Context hält `pendingAvatarUrl` und merged ihn als `avatar_url` ins `user`-Objekt (`effectiveUser` via useMemo). **Alle 12 Avatar-Anzeigestellen** (Profile, Layout, ParcoursReviews, Friends, HighscoreCard etc.) sehen den blob-Preview automatisch ohne eigene Änderung.

Cleanup-Flow: AuthContext registriert `subscribeDrained()`-Listener (nur wenn pendingAvatarUrl gesetzt), ruft `refresh()` → echter server-`avatar_url` → useEffect detektiert "user.avatar_url ≠ pendingUrl & nicht blob:" → revoke + clear. Bei `logout()` wird der pending blob auch revoked.

**Hinweis**: Im AvatarUploader: `isPending = user?.avatar_url?.startsWith("blob:")` als simple Detection — der Entfernen-Button ist während pending versteckt (sonst würde der User versuchen, ein nicht-hochgeladenes Bild zu löschen).

## Session 2026-05-21 — Offline-Foto-Queue erweitert

Generischer Helper `tryUploadOrQueue<T>(opts)` in `src/lib/uploadOutbox.ts` extrahiert das Online-Try-+-Queue-Fallback-Pattern aus StationPhoto. Return-Type:

```ts
{ ok: true; pending: false; data: T }
| { ok: true; pending: true; pendingUrl: string }
```

4xx (außer 408/429) wird propagiert, alles andere queuet. Genutzt von:
- `uploadBowImage` → `bow_image` kind
- `uploadArrowImage` → `arrow_image` kind
- `uploadParcoursImage` → `parcours_image` kind
- `uploadParcoursLaneImage` → `parcours_lane_image` kind
- `uploadTargetImage` (StationPhoto) bleibt direkt — hat zusätzliche resolveId-Logik für tmp-IDs

**UI-Pattern Pending-Preview**: jede Edit-Page hält einen `pendingPhoto: string | null` State (bzw. `Record<laneId, string>` in ParcoursLanes). Bei `r.pending === true` blob: URL in State, alten URL revoken. Beim Unmount alle blob: URLs revoken. `CloudOff`-Badge unten-links auf dem Bild, Delete-Button ausgeblendet solange pending (kann nichts löschen, was nicht hochgeladen ist).

**Bewusst nicht umgestellt**:
- Avatar (`AvatarUploader`) — globaler State über AuthContext, eigener Crop-Flow, seltene Aktion. Kann später wenn Bedarf.
- ParcoursEdit / NewParcours — der bestehende `await uploadParcoursImage(...).catch(()=>{})` toleriert den neuen Return-Type. Offline-Upload wird gequeued ohne UI-Notification (User wird nicht informiert, dass Foto später kommt). Falls relevant: pendingPhoto-State im Form ergänzen, vor `nav(...)` Toast zeigen.

## Session 2026-05-20 — die wichtigsten Änderungen

### Sync-Modus aus Wizard ausgeblendet (Commit 8b787f8)
Sync-Modus war unzuverlässig (Erste-Pfeil-Bug, Turn-Mirror, DartsStandings-Edge-Cases).
**Soft-Remove**: nur UI-Option im `NewTraining`-Wizard entfernt — Grid 3→2 Buttons („Einer scort" / „Jeder selbst"). Backend, DB-Spalten, Migrations 0045/0046 bleiben unangetastet. Reversibel falls Bedarf wiederkommt. TrainingDetail-Rendering für lokal gecachte sync-Trainings bleibt funktional.

### Treffer-Heatmap-MVP (Commit 718e482, Migration 0047)
**Konzept**: Tap auf BullseyePad-Ring setzt Zone (Score) UND initial-Position (x/y im SVG-viewBox). Marker erscheint, ist drag-bar via Pointer-Events; Drag ändert NICHT die Zone, nur die Position. Wer nicht draggt, hat trotzdem ein sinnvolles Signal (Tap-Position selbst).

**DB**: Migration 0047 fügt `shots.pad_x` / `shots.pad_y` (DECIMAL(6,5) NULL) hinzu — **getrennt von `x_norm`/`y_norm`**, die für Foto-Marker auf `uploads/stations/` reserviert bleiben. Vermeidet Datenmischung in Heatmap-Aggregation.

**Backend**: `replace_shots()` in `trainings.php` liest/schreibt pad-Spalten. Score-Logik unverändert (Punkte aus Zone). Neuer Endpoint `GET /stats/heatmap?group_by=tier|lane&parcours_id=&discipline=&bow=`:
- `tier`: Gruppierung pro (animal_or_face, distance_m, discipline)
- `lane`: zusätzlich nach parcours_id
- Filtert auf `tt.animal_or_face IS NOT NULL` — `target_practice` und `simple` fallen aus (haben kein „Tier").

**Frontend**:
- `BullseyePad`: neue Props `selectedPos` + `onPositionUpdate`, Marker als SVG `<g>` mit `touch-action: none`, Pointer-Capture für mobiles Drag.
- `Heatmap`-Komponente (`src/components/Heatmap.tsx`): nutzt `PAD_RINGS` aus BullseyePad (jetzt `export const`), rendert gedämpfte Ringe + Cherry-Punkte mit Alpha (Dichte durch Overlap, kein KDE).
- `TrainingDetail`: neuer `padPositions`-State parallel zu `markers`, im upsertTarget-Body durchgeschleift; aus `existing.shots.pad_x/pad_y` re-hydrated.
- `/stats`: neue Sektion mit Pill-Toggle „Pro Tier+Distanz" / „Pro Bahn". Empty-State-Hint solange keine Pad-Daten existieren.
- `TrainingSummary`: `OwnPadHeatmap`-Section für alle Disziplinen außer `target_practice`/`simple` — aggregiert pad-Treffer des eigenen Spielers über alle Stationen.
- `ParcoursLanes`: `<ParcoursHeatmaps>`-Section (Disclosure, default offen) zeigt eigene Trefferbilder pro (Tier+Distanz) auf diesem Parcours.
- `StationLiveEntry`: `<StationHeatmapHint>` als aufklappbare Mini-Heatmap unter dem BullseyePad — historische Daten für aktuelle (animal_or_face + distance) wenn parcours_id gesetzt.

**Wichtig**: `PAD_RINGS` jetzt exportiert aus `BullseyePad.tsx` — Heatmap-Komponente nutzt dieselbe Ring-Geometrie für visuelle Konsistenz.

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

## DB-Schema (Stand: 51 Migrationen)

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

## Offene Threads (Stand 20.05.2026)

- **Heatmap pro Station** ✅ MVP + Multi-Player-Overlay + Foto-Marker-Mirror (2026-05-21): pad_x/pad_y-Capture, /stats-Heatmap mit tier/lane-Toggle, TrainingSummary mit Multi-Player-Farbcode + Legende, ParcoursLanes-Heatmaps, StationLiveEntry-Hint, PhotoMarkers im collab-Mode zeigt foreign Marker.
- **Logo nachreichen** — PWA-Icons in public/pwa-*.png sind noch Placeholder.
- **Material-Tracking** (Pfeile/Sehnen/Spitzen) — Feature offen.
- **Offline-Foto-Upload** ✅ komplett: Station-Fotos (2026-05-20), Bow/Arrow/Parcours/Parcours-Lane + Avatar (2026-05-21). Übrig: ParcoursEdit/NewParcours-Wizard-Toast (Wizard navigiert nach Save weg ohne Feedback).
- **Admin-UI** ✅ MVP live (2026-05-21): /admin mit User-Liste + Role/Status-Toggle. Mehr (Trainings pro User durchsehen, Parcours-Moderation, Hard-Delete) kann später.
- **Onboarding** ✅ MVP live (2026-05-21): 5-Step-Wizard /welcome, Migration 0051 mit auto-complete für bestehende User.
- **Hilfeseite** ✅ Rewrite mit SVG-Illustrationen + verschachtelten Sub-Akkordeons + konkreten Rechenbeispielen.
- **Disk-Quota-Warnung beim Deploy**: WinSCP meldet 2× in Folge Error-Code 4 beim `mkdir /uploads/arrows`. Wahrscheinlich harmlos (Verzeichnis existiert), aber bei nächstem Upload (Foto/Avatar) prüfen ob echtes IONOS-Quota erreicht ist.

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
31. **Zwei Koordinaten-Systeme in shots-Tabelle** — `shots.x_norm/y_norm` = Marker auf User-Foto der Station (`uploads/stations/`, target_practice nutzt sie auch für TargetPad). `shots.pad_x/pad_y` (Migration 0047) = Position auf dem abstrakten BullseyePad für die Heatmap-Aggregation. NIE überladen: ein Wert in der falschen Spalte verfälscht die Heatmap. Der vorherige Heatmap-Anlauf (Commit d9e4946 revertiert) hatte genau diese Vermischung mit drin.

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
