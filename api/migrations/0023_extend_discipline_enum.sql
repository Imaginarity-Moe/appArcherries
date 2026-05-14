-- Backend kennt seit Migration 0018 + Code-Erweiterungen 8 Disziplinen,
-- die ENUM-Spalte wurde bei 0005 aber nur mit 5 Werten angelegt.
-- Folge: bei Insert mit '3d_ifaa_hunter', '3d_ifaa_animal' oder 'field_ifaa'
-- speichert MySQL ENUM (non-strict) den leeren String '' und das Training
-- ist anschließend in der UI broken (kein BullseyePad, keine Pfeil-Slots).
ALTER TABLE trainings
  MODIFY COLUMN discipline
    ENUM('3d_wa','3d_ifaa','3d_ifaa_hunter','3d_ifaa_animal','3d_bowhunter','field_wa','field_ifaa','simple')
    NOT NULL;
