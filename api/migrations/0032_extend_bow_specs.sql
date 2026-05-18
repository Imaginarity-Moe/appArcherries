-- Bogen-Specs: Länge, Standhöhe, Let-Off (Compound).
ALTER TABLE bows
  ADD COLUMN length_inch DECIMAL(4,1) NULL AFTER draw_weight_lbs,
  ADD COLUMN brace_height_inch DECIMAL(4,2) NULL AFTER length_inch,
  ADD COLUMN let_off_percent TINYINT UNSIGNED NULL AFTER brace_height_inch;
