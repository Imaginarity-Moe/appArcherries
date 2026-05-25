<?php
declare(strict_types=1);

/**
 * Changelog-Items für das "Was ist neu"-Banner im Dashboard.
 *
 * Pflege: ein Eintrag pro nennenswertem Feature, sortiert in der Definition
 * — neueste zuerst. `released_at` als 'YYYY-MM-DD'. `link` (optional) ist eine
 * App-interne Route, auf die der User direkt springen kann.
 */

const CHANGELOG_ITEMS = [
    [
        'key'         => 'sight_marks',
        'released_at' => '2026-05-25',
        'icon'        => '🎯',
        'title'       => 'Sight-Marks-Calculator',
        'desc'        => 'Trage 2–3 bekannte Visiermarken pro Bogen ein — die App interpoliert quadratisch alle Zwischen-Distanzen für dich. Pro Bogen unter „Bearbeiten".',
        'link'        => '/bows',
    ],
    [
        'key'         => 'conversions',
        'released_at' => '2026-05-24',
        'icon'        => '📐',
        'title'       => 'Umrechnungstabellen & Tools',
        'desc'        => 'Live-Konverter Zoll↔mm, Grain↔g, lbs↔kg, Yards↔m. Plus Auszugslänge-Erklärung und Pfeil-Spine-Tabelle ab 10 lbs.',
        'link'        => '/help/conversions',
    ],
    [
        'key'         => 'trainings_tabs',
        'released_at' => '2026-05-24',
        'icon'        => '🗂️',
        'title'       => 'Trainings nach Aktiv / Beendet / Archiv',
        'desc'        => 'Die Dashboard-Liste hat jetzt drei Tabs — endlich übersichtlich getrennt zwischen laufendem Training, abgeschlossenen und archivierten.',
        'link'        => '/',
    ],
    [
        'key'         => 'distance_training',
        'released_at' => '2026-05-23',
        'icon'        => '📏',
        'title'       => 'Distanzschätz-Training',
        'desc'        => 'Trainier deine Entfernungsschätzung für unmarkierte 3D-Parcours. App nennt eine zufällige Distanz, du schätzt, App misst deine Abweichung.',
        'link'        => '/train/distance',
    ],
    [
        'key'         => 'achievements',
        'released_at' => '2026-05-23',
        'icon'        => '🏆',
        'title'       => 'Erfolge & Streaks',
        'desc'        => '18 Erfolge in 5 Kategorien (Erste Schritte, Volume, Vielfalt, Score-Marken, Streaks). Plus Tag-Reihen-Tracker. Findest du im Profil.',
        'link'        => '/profile',
    ],
    [
        'key'         => 'weather_logger',
        'released_at' => '2026-05-23',
        'icon'        => '🌤️',
        'title'       => 'Wetter automatisch geloggt',
        'desc'        => 'Beim Training-Start auf einem Parcours mit Koordinaten wird Wetter (Temperatur, Wind, Bedingungen) automatisch erfasst.',
    ],
    [
        'key'         => 'help_restructured',
        'released_at' => '2026-05-23',
        'icon'        => '📚',
        'title'       => 'Hilfe-Seite neu strukturiert',
        'desc'        => '17 Sections in 5 Themengruppen (Einstieg, Sport, Community, Statistik, Datenschutz). Pflock-Standpunkt-Regeln korrigiert nach Verbands-Vorgaben.',
        'link'        => '/help',
    ],
    [
        'key'         => 'offline_photos',
        'released_at' => '2026-05-21',
        'icon'        => '☁️',
        'title'       => 'Foto-Upload auch offline',
        'desc'        => 'Stationsfotos, Avatar, Bogen-Bilder, Parcours-Lane-Fotos — alle gehen jetzt in eine Sync-Queue wenn du offline bist. Pending-Badge zeigt es an.',
    ],
];

/**
 * Liefert Changelog-Items, optional gefiltert auf alles ab `since`.
 *
 * @param ?string $since ISO-Timestamp oder null (= alle)
 * @return array<int, array<string, mixed>>
 */
function changelog_items(?string $since = null): array
{
    if ($since === null) return CHANGELOG_ITEMS;
    $sinceTs = strtotime($since);
    if ($sinceTs === false) return CHANGELOG_ITEMS;
    return array_values(array_filter(CHANGELOG_ITEMS, function ($it) use ($sinceTs) {
        $ts = strtotime((string)$it['released_at']);
        return $ts !== false && $ts > $sinceTs;
    }));
}
