---
name: 3D-Parcours + Feldbogen — Wertungssysteme & Begriffe
description: Domänen-Wissen für die Trainings-Erfassung in appArcherries — Zonen, Punkte, Pflöcke, Bogenklassen, Anzahl Pfeile pro Ziel
type: reference
originSessionId: 791df5d4-2800-4b75-8e19-816a5c3b7e18
---
Recherchiert am 2026-05-11 für das Training/Score-Datenmodell von appArcherries.
User schießt hauptsächlich **3D-Parcours und Feldbogen**.

## 3D-Parcours — drei kollidierende Wertungssysteme

### WA / DSB (World Archery / Deutscher Schützenbund)
- **2 Pfeile pro Ziel**, beide werden gewertet (Summe)
- Zonen: **11 (innerer Kill) · 10 (zweiter Ring) · 8 (äußerer Ring) · 5 (Körper) · 0 (Fehl/Horn/Huf/Sockel)**
- **Linie zählt höher**: Berührung der Trennlinie reicht für höhere Zone
- Hornurchschuss mit Wertungszone dahinter → Wertung der dahinterliegenden Zone

### IFAA (DFBV in Deutschland) — Standard 3-Pfeil-Runde
- **3 Pfeile pro Ziel**, ABER nur der **erste treffende** Pfeil zählt
- Zonen: **Vital** (Kill) und **Wound** (Körper)
- Punktzahl hängt davon ab, der **wievielte** Pfeil getroffen hat:
  | Pfeil-Nummer | Vital | Wound |
  |---|---|---|
  | 1. Pfeil | 20 | 18 |
  | 2. Pfeil | 16 | 14 |
  | 3. Pfeil | 12 | 10 |
- **Linie zählt NIEDRIGER** (Anreißen nötig, nicht nur Berührung)
- Hornurchschuss → Fehlschuss
- Huftreffer → Wound (anders als bei WA, wo Huf 0 ist)

### IFAA Bowhunter Round (Variante)
- **4 Pfeile pro Ziel**, nur erster treffender zählt
- Zonen mit Punktzahlen 5/4/3 (statt 20/18 etc.)
- Andere Pfeilanzahl-Reihenfolge

## Feldbogen WA / DSB

- **24 Scheiben × 3 Pfeile = 72 Pfeile**
- **12 markierte + 12 unmarkierte** Distanzen (in einer Runde gemischt)
- Vier Auflagen-Durchmesser: **Ø 20, 40, 60, 80 cm**
- Distanzen: **5–60 m** (markiert), **2–55 m** (unmarkiert)
- Wertung pro Pfeil: **6 (innen) – 5 – 4 – 3 – 2 – 1 – 0 (Fehl)**
- Center "X" (=6, innerstes Goldfeld) zählt für Tie-Break

## Pflock-System (3D)

Welche Distanz du schießen darfst, hängt von deiner Bogenklasse + Alter ab. Pflöcke sind farbig markiert:
| Pflock | Klasse | Typische Distanz unmarkiert |
|---|---|---|
| **Blau** | Visier (Recurve, Compound, erfahrene Schützen) | 10–45 m |
| **Rot** | Blank, Lang, Instinktiv, Trad | 5–30 m |
| **Gelb** | Jugend | kürzer |
| **Weiß** | Kinder / Anfänger | sehr kurz |

## Bogenklassen (Feld + 3D, Deutschland)

- **Recurve (R)** — olympisch, Visier + Stabilisator
- **Compound (C)** — Cam-Bogen, Visier mit Skope, Release, oft Backtension
- **Blankbogen / Barebow (BB)** — Recurve ohne Visier/Stabilisator
- **Langbogen (LB)** — traditioneller Holzbogen
- **Instinktivbogen (IB)** — ohne aktives Zielen
- **Jagdrecurve / Hunting (HU)** — Recurve im Jagdstil
- **Reiterbogen (HB)** — kurzer asymmetrischer Bogen
- **Primitivbogen (PB)** — handgefertigt aus Naturmaterialien

**Im MVP-Schema zusammengefasst zu 4 Klassen:** `recurve`, `compound`, `barebow`, `traditional` (= LB/IB/HU/HB/PB). Kann später ohne Schema-Änderung erweitert werden (ENUM um Werte ergänzen via ALTER).

## Standard-Parcours-Größen

- **3D-Turnier**: typisch **28 Stationen**, manchmal 24
- **Feldrunde WA**: **24 Scheiben**

## Quellen

- DSB Modus 3D / Modus Feldbogen (dsb.de)
- bogenladen-collenberg.de — "Treffer oder nicht?" (WA vs IFAA Detail)
- IFAA Constitution (faae.ee, pdf)
- World Archery Book 4 — Feldbogen-Regeln
