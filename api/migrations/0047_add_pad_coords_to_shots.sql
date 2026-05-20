-- Pad-Koordinaten für Heatmap-Capture: getrennt von x_norm/y_norm (= Foto-Marker).
-- Normalisierte Position auf dem abstrakten BullseyePad (0..1, (0.5, 0.5) = Zentrum).
ALTER TABLE shots
  ADD COLUMN pad_x DECIMAL(6,5) NULL AFTER y_norm,
  ADD COLUMN pad_y DECIMAL(6,5) NULL AFTER pad_x;
