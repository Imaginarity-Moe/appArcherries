---
name: Archerries UI/UX Design-Direktive
description: Premium minimal Design-Vorgaben des Users — Palette, Typo, Komponenten, Motion. Inspiration Apple/Linear/Arc, skandinavisch, japanisch-minimal. Cherry-Akzente, kein Forest-Grün mehr.
type: reference
originSessionId: e94a30a0-56e9-4203-943d-7c27061b8f33
---
**Quelle:** vom User explizit als zu befolgender Prompt gegeben, 2026-05-13.
**Status:** wird inkrementell ausgerollt (siehe project_status_live für Stand).

## Brand-Konzept

"Archerries" = Bogensport + Kirschen + Eleganz + moderne Sport-Ästhetik + dezente Sinnlichkeit + minimalistischer Luxus.

**Inspiration:** Apple, Linear, Arc Browser, Scandinavian Premium, japanischer Minimalismus, Luxury Editorial.

**Tabu:** kindlich, comic-haft, gamer-style, Neon, aggressives Sport-Branding.

**Gefühl:** ruhig, fokussiert, präzise, premium, elegant, atmend, hochnutzbar.

## Farbsystem (löst Forest/Copper ab)

**Primärfarben:**
- Warm Black `#111111`, Soft Graphite `#1C1C1E`, Charcoal `#232326`, Deep Slate `#2B2D31`
- Soft Ivory `#F5F2EB`, Warm White `#FAF8F4`

**Akzent (Cherry):**
- Muted Cherry `#8E2C3A`, Dark Cherry `#641E28`, Dusty Rose `#B46A76`

**Sekundäre Akzente:**
- Soft Gold `#C6A56B`, Muted Sage `#7A8B7A`

**Surface (Dark-Mode):**
- Primary `#18181A`, Secondary `#222326`, Elevated `#2A2C30`
- Hairline Border `rgba(255,255,255,0.08)`

**Text:**
- Primary `#F5F2EB`, Secondary `rgba(245,242,235,0.72)`, Muted `rgba(245,242,235,0.45)`

**Regeln:**
- Rot/Cherry **sehr sparsam** als Akzent.
- Großteil der UI funktioniert **monochrom**.
- **Keine** hohe Sättigung. **Keine** reinen Weiß/Schwarz. **Keine** Gradient-Inflation. **Keine** glowing Gamer-Effekte.

## Typografie

- Stil wie Avenir Next, SF Pro Display, oder Inter mit custom Spacing.
- elegant, geometrisch, luftig, premium Spacing, leicht editorial
- großzügiges Letter-Spacing in Headlines, klare Hierarchie, viel Whitespace, thin-to-medium Weights

## Logo-Verwendung

Drei Varianten existieren in `src/assets/`:
- `logo.svg` (Symbol-only)
- `schriftzug.svg` (Wordmark-only)
- `log_schriftzug.svg` (Symbol + Wordmark)

**NIE croppen, NIE falsch zoomen, NIE in Container die sie abschneiden.** Immer korrektes Aspect-Ratio + Whitespace + Retina-scharf. Premium intentional platziert.

## Layout

- **Persistenter Top-Header**: semi-transparent, subtle blur, dünner Border, nicht bulky — wie iOS native / Arc / Linear
- **Persistenter Bottom-Nav**: floating / semi-floating, elegant active states, subtle motion, abgerundet, perfekt für Daumen, icon-first

## Safe-Areas (Pflicht)

`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` — iOS-Notch + Dynamic Island, Android-Geste-Navi, viewport-fit=cover.

## Komponenten-Stil

- **Buttons**: ruhig, taktil, leicht abgerundet, dezente Hover/Press, premium Motion
- **Cards**: Tiefe über Kontrast, NICHT über Schatten. Layered Surfaces, elegante Borders.
- **Inputs**: zurückhaltend, hochgradig lesbar, ruhige Focus-States, **kein** Bright-Blue-Focus-Ring
- **Dividers**: dünn, elegant
- **Glassmorphism**: nur dezent, restrained Blur
- **Shadows**: minimal, sanfte Radii, breathable Layouts

## Motion

Subtle, fast, premium, **nie verspielt**. Inspiration: Linear, iOS, Framer Motion premium.

## Anwendung im Projekt

Die App nutzt aktuell ein "Modern Forest"-Theme (forest-grün primär, copper Akzent) — das ist die zu ersetzende Vorgängergeneration. Cherry tritt an die Stelle von Copper als einziger Akzent. Forest-Grün entfällt fast komplett; Muted Sage `#7A8B7A` kann ggf. als rest-grün-Reminiszenz auftreten, aber sehr sparsam.

**Tailwind-Token-Naming**: semantisch (`bg-surface`, `bg-elevated`, `text-primary`, `accent-cherry`) statt farbnamen-basiert. CSS-Variablen für Dark/Light-Mode-Switching.

## Rollout-Reihenfolge (siehe project_status_live für aktuellen Stand)

1. Foundation: Tailwind-Theme + CSS-Variablen + Typo
2. Layout-Shell: Header + Bottom-Nav (Glass, Floating)
3. Core-Komponenten: Buttons, Cards, Inputs
4. Page-Polish (Dashboard zuerst, dann Auth, TrainingDetail, Stats, Parcours, Profile, Help)
5. Motion + Dark-Mode-Feinschliff
