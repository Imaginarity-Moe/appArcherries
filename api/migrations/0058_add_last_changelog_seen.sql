-- Pro-User-Marker: bis zu welchem Zeitpunkt hat er den Changelog gesehen?
-- Items mit released_at > last_changelog_seen werden im "Was ist neu"-Banner gezeigt.
-- NULL = noch nie gesehen → zeigt alle aktuellen Items.
ALTER TABLE users
  ADD COLUMN last_changelog_seen TIMESTAMP NULL DEFAULT NULL AFTER deleted_at;
