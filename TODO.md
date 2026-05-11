# Archerries — TODO

Lebende Aufgabenliste. Was in dieser Nacht (11./12.05.2026) live geht, wird abgehakt.
Alles andere ist Arbeitsvorrat für die kommenden Sessions.

---

## In dieser Nacht (12.05.2026) live gegangen
<!-- Wird unten beim Abarbeiten gefüllt -->

---

## Designsystem & Foundation

- [ ] **Theme-Overhaul** — "Modern Forest"-Palette mit copper-Akzent, Inter/Fraunces/JetBrains-Mono-Fonts, sanfte Schatten, Papier-Hintergrund
- [ ] **Mobile Bottom-Nav + Desktop-Sidebar** — responsive Layout, Logo, Profil, vier Sektionen
- [ ] **i18n-Setup** (i18next + react-i18next) — DE-Default, EN als zweite Sprache, Browser-Detection
- [ ] **Sprach-Toggle** in /profile + dezent auf der Login-Seite
- [ ] **Lucide-Icons** + 5-6 Custom-SVGs (Recurve, Compound, 3D-Tier, Pflock, Zielscheibe)
- [ ] **Dark Mode** als Toggle in /profile (Standard: Light)
- [ ] **PWA-Manifest** + Service-Worker — App installierbar auf Smartphone
- [ ] **Offline-Eingabe** + Background-Sync — kritisch für Parcours mit Funkloch

## Auth & Profil

- [ ] **Auth-Seiten** redesignen (Login/Register/Verify/Reset) — minimalistisch, Wordmark in Fraunces
- [ ] **/profile**-Seite — Anzeigename, Sprache, Dark-Mode, Standard-Bogen, "Mein Verein"
- [ ] **Avatar-Upload** (optional, später)
- [ ] **Account löschen** mit Confirm-Bottom-Sheet
- [ ] **Passwort ändern** (eingeloggt)

## Dashboard

- [ ] **Begrüßung mit Fraunces** + Datum
- [ ] **Glimpse-Karten horizontal scroll** — 3-5 Kennzahlen (Anzahl Trainings, PB, Ø letzte 4 Wochen, aktiver Bogen)
- [ ] **Trainings-Card mit Sparkline** der Stations-Scores als visueller Hook
- [ ] **Floating-Action-Button** für "+Neues Training"
- [ ] **Empty-State-Illustration** mit Bogenschützen-Schatten und CTA
- [ ] **Filter-Chips** über der Liste (Disziplin, Bogen, Zeitraum)

## Neues Training

- [ ] **Wizard 3 Schritte** statt Long-Form: Disziplin / Bogen+Pflock+Distanz / Kontext
- [ ] **Disziplin-Cards** mit Kurz-Erklärung + Icon
- [ ] **Bogen als Icon-Grid** (Recurve, Compound, Barebow, Trad-Familie)
- [ ] **Pflock-Farbpunkte** statt Dropdown
- [ ] **Parcours auswählen** aus eigener Liste (siehe Parcours-Sektion)
- [ ] **Geo-Suggest** für "Ort"-Feld aus vergangenen Orten als Chips

## Live-Eingabe (Training-Detail)

- [ ] **Vollbild-Stations-Modus** mit Swipe zwischen Stationen + Bottom-Sticky-Buttons
- [ ] **Bullseye-Pad SVG** mit anklickbaren Ringen für 3D + Field (Farb-Code WA-konform)
- [ ] **Pfeil-Slots** (1, 2, 3) — aktiver Slot mit copper-Border
- [ ] **Stations-Total animiert hochzählen** in copper-Mono
- [ ] **Stations-Picker** als Bottom-Sheet mit Status-Grid (gefüllt/unvollständig/leer)
- [ ] **IFAA-Auto-Ausgrauen** weiterer Pfeile nach erstem Treffer + Tooltip
- [ ] **Optimistic Save** mit Retry bei Funkloch
- [ ] **Inline-Edit** für Tier + Distanz pro Station (nicht verpflichtend)
- [ ] **Training-Ende-Screen** mit großem Total, Sparkline, "Notiz hinzufügen"
- [ ] **Kontextuelle Onboarding-Hinweise** (3 dezente Tooltips)

## Parcours-Verwaltung (NEU)

- [ ] **DB-Schema**: `parcours` (id, owner_user_id, name, description, lat, lng, address, image_path, is_public, created_at)
- [ ] **Migration für trainings**: `parcours_id` (nullable FK), referenziert `parcours`
- [ ] **Endpoints**: `/parcours` CRUD + `/parcours/upload` für Bilder
- [ ] **Karten-View** mit Leaflet — eigene Parcours + öffentliche als Marker
- [ ] **Parcours-Detail-Seite** mit Bild, Beschreibung, Karte, "Hier trainieren"-Button
- [ ] **Bild-Upload** (Drag&Drop + Datei-Picker) mit Vorschau, max 5 MB, JPEG/PNG/WebP
- [ ] **Stations pro Parcours** (optional, später) — gespeicherte Anzahl, Standard-Tiere/Distanzen, könnte als Vorlage für neue Trainings dienen
- [ ] **Public/Private Toggle** — eigene Parcours für andere User sichtbar machen
- [ ] **Bewertungssystem** für Parcours (Sterne + Notiz, später)

## Statistik

- [ ] **Recharts installieren** und global einbauen
- [ ] **/stats Page** mit Filter-Chips (Disziplin, Bogen, Zeitraum)
- [ ] **Punkte-Verlauf-Line-Chart** über Zeit
- [ ] **Zonen-Verteilung** als horizontale Bars oder stilisiertes Bullseye-Heatmap
- [ ] **Pfeil-Position-Analyse** (Ø 1./2./3. Pfeil) — zeigt Material-Schwächen
- [ ] **PB-Cards horizontal scroll** pro Disziplin+Bogen
- [ ] **Statistik nach Training** — eigener "Auswertungs"-Screen direkt nach dem Beenden
- [ ] **Vergleich zwischen zwei Trainings** (Side-by-Side, später)
- [ ] **Export** (CSV / PDF) der Statistik (später)

## Hilfe-Seiten

- [ ] **/help Hub** mit Sidebar-Kategorien (mobile: Chips oben)
- [ ] **Markdown-Loader** für Hilfe-Artikel pro Sprache
- [ ] **Artikel: Disziplinen** (WA-3D, IFAA-3D, Bowhunter, Feld-WA)
- [ ] **Artikel: Wertungssysteme** mit Wertungs-Tabellen
- [ ] **Artikel: Pflöcke & Distanzen**
- [ ] **Artikel: Bogenklassen**
- [ ] **Artikel: Glossar** (Spot, Passe, X-Ring, Killzone, etc.)
- [ ] **Inline-Help-Icons** neben kritischen Form-Feldern → Bottom-Sheet-Erklärung
- [ ] **Suchleiste** in /help — Volltextsuche (clientseitig genügt)
- [ ] **Glossar-Tooltips** im Fließtext (dotted underline + Tap-Definition)

## Gemeinsame Runden (QR-Code-Einladungen)

- [ ] **DB-Schema**: `training_participants` (training_id, user_id|guest_id, role: owner/scorer/spectator)
- [ ] **Invitation-Tokens** + Mail-Versand
- [ ] **QR-Code-Komponente** (`qrcode.react`)
- [ ] **Share-Link** mit ablaufendem Token
- [ ] **Live-Sync** der Scores (Polling alle 5s reicht erstmal)
- [ ] **Guest-Conversion** zu echtem User-Account (analog TripSplit-Pattern)
- [ ] **Permission-Layer** — wer darf was eintragen/sehen

## Datenmodell-Erweiterungen (Wunschliste)

- [ ] **Bogen-Profile** — User kann mehrere Bögen mit Setup speichern (Spitzen-Gewicht, Visiermarken etc.)
- [ ] **Material-Tracking** — Pfeile, Spitzen, Sehnen mit Verbrauch/Wechsel-Datum
- [ ] **Wetter-Felder** strukturiert: Wind, Temperatur, Niederschlag
- [ ] **Equipment-Loadout pro Training** — welcher Bogen + Pfeil-Set + Visiermarke
- [ ] **Foto pro Training/Station** (optional)
- [ ] **Voice-Notes** ("Was habe ich heute gelernt?")
- [ ] **Ziele** (Quartalsziele, Wettkampf-Vorbereitung)

## Polishing & Qualität

- [ ] **Toast-System** (sonner oder react-hot-toast) für nicht-blockierende Hinweise
- [ ] **Skeleton-Loader** statt "Lade…"-Text
- [ ] **Page-Transitions** dezent (200ms fade)
- [ ] **Error-Boundary** mit hübschem Fallback
- [ ] **404-Page** mit Wordmark + CTA zurück
- [ ] **Mehrere User-Feedback-Wege**: Account löschen, Bug melden, Feature wünschen
- [ ] **A11y**: Tastatur-Navigation, ARIA, prefers-reduced-motion respektieren

## Tests

- [ ] **Vitest** für Scoring-Logik (Frontend)
- [ ] **PHPUnit** o.ä. light für Backend-Scoring (composer-frei: einfache assert-Tests)
- [ ] **Playwright** für Auth-Flow + Training-Anlegen + Live-Eingabe

## DevOps & Wartung

- [ ] **GitHub Actions**: Lint + Build bei PR
- [ ] **Dependabot**
- [ ] **.htaccess für /uploads** — Bilder ausliefern, PHP blockieren
- [ ] **Bilder-Optimierung** beim Upload (Server-side resize via PHP GD)
- [ ] **DB-Backup-Strategie** — IONOS-Auto-Backup-Check, manueller Export-Endpoint
- [ ] **Logging** für API-Fehler (server-side error_log → später ggf. Sentry/eigenes Tool)
- [ ] **Rate-Limiting** für Auth-Endpoints (IONOS hat schon eines, aber zusätzlich)
- [ ] **HSTS-Header** + weitere Security-Headers prüfen

## Ideen, über die ich nachgedacht habe und gerne diskutieren würde

### Sport-Inhalt
- **"Schnelles Training"-Modus**: Nur 1-2 Pfeile, kein Parcours — z.B. "10-min Aufwärmen, 15 Schuss, Score". Reduziert Eingabe-Aufwand für Stamm-Übungen.
- **Standard-Parcours-Vorlagen**: Wenn man oft denselben Parcours schießt, könnte die App nach 3-mal anlegen vorschlagen "Diesen Parcours speichern als Vorlage" → spart künftig die Distanz-Eingabe.
- **Wettkampf-Modus**: Spezial-Modus "Heute ist Turnier" — sperrt Bearbeiten nach dem Eintrag, fügt ein Wettkampfsiegel + Datum hinzu, kann später als "offizielle Wertung" gefiltert werden.
- **"Trainings-Tagebuch"**: Frei-Text-Felder pro Tag (vorher/nachher) — was wollte ich üben, was habe ich gelernt. Wird in /stats als Suche durchsuchbar.

### Soziale Features
- **Verein-Anbindung**: User können einem Verein beitreten (Code/Einladung) → Vereins-Übersicht zeigt Top-Scores des Vereins, Vereinsrekorde, gemeinsame Turnier-Anmeldung.
- **Buddy-Vergleich**: 1-1 Freund hinzufügen — sieht dessen Trainings (mit Permission), kann auf "Gut geschossen" o.ä. dezent reagieren. Kein Newsfeed, eher 1-zu-1 Cheerleader.
- **"Mein Coach"**: Trainer kann auf User-Daten zugreifen (Read-only) — sieht Verlauf und kann Tipps als Kommentare hinterlassen.

### Performance & Analytik
- **Material-Auswertung**: Wenn man Pfeile X, Y, Z separat trackt, könnte die App nach Wochen sagen "Pfeil 3 hat statistisch schwächere Werte — vielleicht ein Material-Problem?".
- **Form-Defekt-Erkennung**: Bei systematischen Abweichungen ("alle Treffer links-unten") könnte ein Tipp eingeblendet werden → Verlinkung zu Hilfe-Artikel.
- **Konsistenz-Score**: Standardabweichung als "Konsistenz-Index" anzeigen — niedrige Streuung = hohe Konsistenz, auch wenn Mittelwert mal nicht top ist.

### UX-Klein-Spielereien
- **"Bogen aufwärmen"-Erinnerung**: Wenn ein User 3 Tage nicht trainiert hat, ein dezenter "Lust auf eine Runde?"-Hinweis im Dashboard (nicht als Push-Notification — würde nerven).
- **Schöne Drucksache**: Training als "Score-Card" zum Drucken — wie eine offizielle Wettkampf-Wertung aussehend, mit deinem Namen drauf. Cooles Souvenir-Feature.
- **Jährlicher Rückblick**: Ein "Spotify-Wrapped"-Style Jahresrückblick im Januar mit "Du hast 2026: 47 Trainings absolviert, dein PB-Tag war der 12. Mai mit 312 Punkten, dein Lieblings-Parcours war Eichwald (12×)".
- **Wetter-API-Integration** optional: bei Eintrag eines Trainings holt die App rückwirkend das Wetter — wenn man wissen will, "wie schieße ich bei Wind".

### Tech-Klein-Spielereien
- **PWA mit Offline-First**: Training-Daten in IndexedDB, Sync wenn online. Macht die App auf dem Parcours auch ohne Empfang nutzbar — und installierbar als "App" auf Android/iOS.
- **iOS-Style Sheets statt Modals** auf Mobile (Bottom-Sheets) — fühlt sich nativer an.
- **Haptic-Feedback** subtle bei Eingabe (Web Vibration API, 10ms).
- **Skia / Canvas-basierte Animation** für End-Of-Training-Confetti-light (kleiner Pfeil fliegt in Mitte und schlägt ein) — nur einmal pro Training, dezent.

---

## Bekannte Stolperfallen (siehe Memory)

- IONOS' Reverse-Proxy schluckt `/api/<route>`-Rewrites → wir nutzen `/api/index.php/<route>`
- `.env.deploy.cmd` muss CRLF haben (cmd.exe-Eigenheit)
- WinSCP synchronize skipt Dotfiles bei gleicher Mtime → explizites `put` für `.htaccess`
- Authorization-Header wird von IONOS gestrippt → `RewriteRule ^ - [E=HTTP_AUTHORIZATION:...]` in api/.htaccess
- MySQL macht implicit COMMIT bei DDL → in migrate.php keine Transaktion um CREATE TABLE
- Vite-Cache: nach Frontend-Änderungen Strg+F5 nötig (alte Bundle-Hashes bleiben im Browser-Cache)
