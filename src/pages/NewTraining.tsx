import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Target, Crosshair, Hash, Bird, MapPin, Loader2 } from "lucide-react";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  PEG_LABELS,
  createTraining,
  type BowType,
  type Discipline,
  type PegColor,
} from "../api/trainings";
import { listParcours, type Parcours } from "../api/parcours";
import { listBows, type Bow } from "../api/bows";
import { listTrainings } from "../api/trainings";
import { Link } from "react-router-dom";
import { usePageFooter } from "../components/FooterContext";
import { addFavorite, listFavorites, removeFavorite } from "../api/favorites";
import { Star } from "lucide-react";

const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const BOWS = Object.keys(BOW_LABELS) as BowType[];
const PEGS = Object.keys(PEG_LABELS) as PegColor[];

const DISCIPLINE_BLURBS: Record<Discipline, string> = {
  "3d_wa":          "11/10/8/5, 2 Pfeile, beide zählen",
  "3d_ifaa":        "Inner/Outer/Wound — 3 Pfeile, nur Erstpfeil. 20/18/16 → 14/12/10 → 8/6/4",
  "3d_ifaa_hunter": "Inner 20 · Outer 17 · Wound 10 — 1 Pfeil pro Ziel",
  "3d_ifaa_animal": "Kill/Wound 20/18 → 16/14 → 12/10, optional NFAA-Bonus +1",
  "3d_bowhunter":   "Liga-Variante: 5/4/3, 3 Pfeile, nur Erstpfeil",
  "field_wa":       "6-5-4-3-2-1, 4 Pfeile pro Auflage, X separat (Tie-Break)",
  "field_ifaa":     "5-4-3, 4 Pfeile pro Scheibe",
  simple:           "Nur Gesamt-Score, keine Pfeile",
  target_practice:  "Frei konfigurierbares Scheibenschießen mit Pfeile/Aufnahmen/Distanz/Wertung",
};

const DISCIPLINE_ICONS: Record<Discipline, ReactNode> = {
  "3d_wa":          <Bird size={20} />,
  "3d_ifaa":        <Bird size={20} />,
  "3d_ifaa_hunter": <Crosshair size={20} />,
  "3d_ifaa_animal": <Bird size={20} />,
  "3d_bowhunter":   <Crosshair size={20} />,
  "field_wa":       <Target size={20} />,
  "field_ifaa":     <Target size={20} />,
  simple:           <Hash size={20} />,
  target_practice:  <Target size={20} />,
};

const PEG_COLORS_HEX: Record<PegColor, string> = {
  blue: "#3B82F6",
  red: "#DC2626",
  yellow: "#F5C137",
  white: "#FFFFFF",
};

export default function NewTraining() {
  const { t } = useTranslation(["training", "common"]);
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [discipline, setDiscipline] = useState<Discipline>("3d_wa");
  const [bowType, setBowType] = useState<BowType>("recurve");
  const [pegColor, setPegColor] = useState<PegColor | "">("");
  const [distanceMode, setDistanceMode] = useState<"" | "marked" | "unmarked">("");
  const [parcoursId, setParcoursId] = useState<number | null>(null);
  const [startLane, setStartLane] = useState<number>(1);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  // target_practice-Konfiguration — als String gehalten, damit der User das Feld
  // löschen und neu eingeben kann (Number-state mit Clamp schluckt leere Eingaben).
  const [tpArrowsPerEnd, setTpArrowsPerEnd] = useState<string>("3");
  const [tpNumEnds, setTpNumEnds] = useState<string>("10");
  const [tpDistance, setTpDistance] = useState<string>("18");
  const [tpRings, setTpRings] = useState<string>("10");
  const [tpScoringMode, setTpScoringMode] = useState<"points" | "legs" | "sets">("points");
  const [tpLegsToWin, setTpLegsToWin] = useState<string>("3");
  const [tpSetsToWin, setTpSetsToWin] = useState<string>("2");
  const [tpSharedMode, setTpSharedMode] = useState<"solo" | "collab">("solo");

  // Hilfsfunktion: clamped Number aus String, fallback bei leer
  const clampInt = (v: string, min: number, max: number, fallback: number) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parcoursOptions, setParcoursOptions] = useState<Parcours[]>([]);
  const [bows, setBows] = useState<Bow[]>([]);
  const [selectedBowId, setSelectedBowId] = useState<number | null>(null);
  const [showBowOverride, setShowBowOverride] = useState(false);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [nfaaMode, setNfaaMode] = useState(false);
  const [favDisciplines, setFavDisciplines] = useState<Set<Discipline>>(new Set());

  const is3d = discipline.startsWith("3d_");
  const isAnimal = discipline === "3d_ifaa_animal";

  useEffect(() => {
    listParcours().then((r) => setParcoursOptions(r.parcours)).catch(() => {});
    listBows()
      .then((r) => {
        setBows(r.bows);
        // Default-Bogen vorauswählen
        const def = r.bows.find((b) => b.is_default) ?? r.bows[0];
        if (def) {
          setSelectedBowId(def.id);
          setBowType(def.bow_type);
        }
      })
      .catch(() => {});
    // Letzte unique Locations für Vorschlag-Chips
    listTrainings(1, 30)
      .then((r) => {
        const seen = new Set<string>();
        const locs: string[] = [];
        for (const t of r.trainings) {
          if (t.location && !seen.has(t.location)) {
            seen.add(t.location);
            locs.push(t.location);
            if (locs.length >= 5) break;
          }
        }
        setRecentLocations(locs);
      })
      .catch(() => {});
    // Favorisierte Disziplinen laden — werden im Step 1 oben sortiert
    listFavorites()
      .then((r) => {
        const favs = new Set<Discipline>();
        for (const f of r.favorites) {
          if (f.kind === "discipline") favs.add(f.ref as Discipline);
        }
        setFavDisciplines(favs);
        // Wenn nur 1 favorit & user noch nicht manuell geändert → vorauswählen
        if (favs.size === 1 && discipline === "3d_wa") {
          setDiscipline([...favs][0]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleDisciplineFavorite(d: Discipline) {
    const next = new Set(favDisciplines);
    if (next.has(d)) {
      next.delete(d);
      setFavDisciplines(next);
      removeFavorite("discipline", d).catch(() => null);
    } else {
      next.add(d);
      setFavDisciplines(next);
      addFavorite("discipline", d).catch(() => null);
    }
  }

  // Disziplinen sortiert: Favoriten zuerst, dann Rest in Original-Reihenfolge
  const sortedDisciplines = useMemo(() => {
    const fav = DISCIPLINES.filter((d) => favDisciplines.has(d));
    const rest = DISCIPLINES.filter((d) => !favDisciplines.has(d));
    return [...fav, ...rest];
  }, [favDisciplines]);

  // Step-spezifische Footer-Actions (Zurück+Weiter immer sichtbar, auch bei langer Form).
  // Submit von Step 3 läuft über submit() — das passiert via Action-Button hier.
  const footerActions = useMemo(() => {
    if (step === 1) {
      return [
        { kind: "button" as const, icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Abbrechen", onClick: () => nav("/") },
        { kind: "button" as const, icon: <ArrowRight size={20} strokeWidth={2} />, label: "Weiter", primary: true, onClick: () => setStep(2) },
      ];
    }
    if (step === 2) {
      return [
        { kind: "button" as const, icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück", onClick: () => setStep(1) },
        { kind: "button" as const, icon: <ArrowRight size={20} strokeWidth={2} />, label: "Weiter", primary: true, onClick: () => setStep(3) },
      ];
    }
    return [
      { kind: "button" as const, icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück", onClick: () => setStep(2) },
      { kind: "button" as const, icon: <Check size={20} strokeWidth={2} />, label: busy ? "Speichere…" : "Starten", primary: true, onClick: () => submit() },
    ];
  }, [step, busy]);
  usePageFooter(footerActions);

  function pickBow(b: Bow) {
    setSelectedBowId(b.id);
    setBowType(b.bow_type);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const isTargetPractice = discipline === "target_practice";

      // Wetter-Auto-Logger: wenn Parcours mit Koordinaten + kein manuelles Wetter:
      // Open-Meteo abfragen und in `weather` schreiben. Robust (Timeout 5s, Failure → leer).
      let weather: string | null = null;
      const selectedParcours = parcoursId
        ? parcoursOptions.find((p) => p.id === parcoursId)
        : null;
      if (selectedParcours && selectedParcours.lat != null && selectedParcours.lng != null) {
        try {
          const { fetchWeatherSnippet } = await import("../lib/weather");
          weather = await fetchWeatherSnippet(selectedParcours.lat, selectedParcours.lng);
        } catch {/* still create training even if weather fetch fails */}
      }

      const r = await createTraining({
        discipline,
        nfaa_mode: isAnimal ? nfaaMode : false,
        bow_type: bowType,
        bow_id: selectedBowId,
        peg_color: is3d && pegColor ? (pegColor as PegColor) : null,
        distance_marked: distanceMode === "" ? null : distanceMode === "marked",
        parcours_id: isTargetPractice ? null : parcoursId,
        start_lane: parcoursId && startLane > 1 && !isTargetPractice ? startLane : undefined,
        location: location || null,
        weather,
        notes: notes || null,
        // target_practice-Felder (Backend ignoriert sie bei anderen Disziplinen)
        ...(isTargetPractice ? {
          arrows_per_end:    clampInt(tpArrowsPerEnd, 1, 20, 3),
          num_ends:          clampInt(tpNumEnds, 1, 50, 10),
          target_distance_m: clampInt(tpDistance, 1, 200, 18),
          target_rings:      clampInt(tpRings, 3, 12, 10),
          scoring_mode: tpScoringMode,
          ...(tpScoringMode !== "points" ? { legs_to_win: clampInt(tpLegsToWin, 1, 20, 3) } : {}),
          ...(tpScoringMode === "sets"   ? { sets_to_win: clampInt(tpSetsToWin, 1, 10, 2) } : {}),
          shared_scoring_mode: tpSharedMode,
        } : {}),
      });
      nav(`/trainings/${r.training.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Training nicht anlegen");
      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Step-Indicator */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => (step === 1 ? nav("/") : setStep((step - 1) as 1 | 2 | 3))} className="btn-icon" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step ? "w-8 bg-copper-500" : n < step ? "w-4 bg-copper-300" : "w-4 bg-forest-100 dark:bg-forest-800"
              }`}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <header className="text-center mb-2">
            <h1 className="font-display text-2xl font-semibold mb-1">{t("training:wizard.step1_title")}</h1>
            <p className="text-sm text-forest-700 dark:text-forest-300">{t("training:wizard.step1_subtitle")}</p>
          </header>

          <div className="grid grid-cols-2 gap-3">
            {sortedDisciplines.map((d) => {
              const sel = d === discipline;
              const isFav = favDisciplines.has(d);
              return (
                <div key={d} className="relative">
                  <button
                    type="button"
                    onClick={() => setDiscipline(d)}
                    className={`card text-left tap-large transition active:scale-[0.98] w-full ${
                      sel
                        ? "ring-2 ring-cherry-500 bg-cherry-50 dark:bg-cherry-900/20"
                        : "hover:shadow-lift"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1 pr-6">
                      <div className={sel ? "text-cherry-500" : "text-secondary"}>
                        {DISCIPLINE_ICONS[d]}
                      </div>
                      <div className="font-display text-base font-semibold flex-1">
                        {DISCIPLINE_LABELS[d]}
                      </div>
                      {sel && <Check size={16} className="text-cherry-500" />}
                    </div>
                    <div className="text-xs text-secondary">{DISCIPLINE_BLURBS[d]}</div>
                  </button>
                  {/* Stern in der Ecke — Favorit-Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDisciplineFavorite(d);
                    }}
                    className="absolute top-2 right-2 p-1.5 -m-1.5 rounded-full no-tap-highlight"
                    aria-label={isFav ? "Favorit entfernen" : "Als Favorit speichern"}
                  >
                    <Star size={16} strokeWidth={1.5} className={isFav ? "fill-gold text-gold" : "text-muted"} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* NFAA-Toggle — nur sichtbar bei IFAA Animal Round */}
          {isAnimal && (
            <label className="card flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={nfaaMode}
                onChange={(e) => setNfaaMode(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-cherry-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm">NFAA-Modus</div>
                <div className="text-xs text-secondary mt-0.5">
                  +1 Bonuspunkt auf jeden Treffer (Kill & Wound). Statt 20/18 → 21/19 etc.
                </div>
              </div>
            </label>
          )}

          <button onClick={() => setStep(2)} className="btn w-full tap-large mt-4">
            {t("common:actions.next")} <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <header className="text-center mb-2">
            <h1 className="font-display text-2xl font-semibold mb-1">{t("training:wizard.step2_title")}</h1>
            <p className="text-sm text-forest-700 dark:text-forest-300">{t("training:wizard.step2_subtitle")}</p>
          </header>

          {/* Bow-Profile (wenn vorhanden) */}
          {bows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 flex items-center justify-between">
                <span>Mein Bogen</span>
                <Link to="/bows" className="text-xs text-copper-600 font-normal">Verwalten →</Link>
              </label>
              <div className="flex flex-wrap gap-2">
                {bows.map((b) => {
                  const sel = b.id === selectedBowId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => pickBow(b)}
                      className={`rounded-2xl px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                        sel
                          ? "bg-copper-500 text-white shadow-copper"
                          : "bg-sunken dark:bg-sunken-dark text-forest-700"
                      }`}
                    >
                      {b.name}
                      <span className={`ml-1.5 text-xs ${sel ? "text-white/80" : "text-forest-500"}`}>
                        · {BOW_LABELS[b.bow_type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bow-Type: bei bestehenden Profilen versteckt unter "Andere Klasse..."  */}
          {bows.length === 0 || showBowOverride ? (
            <div>
              <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
                {bows.length > 0 ? "Bogenklasse manuell" : t("training:wizard.select_bow")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BOWS.map((b) => {
                  const sel = b === bowType;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => { setBowType(b); setSelectedBowId(null); }}
                      className={`tap-target rounded-xl px-4 py-3 font-medium transition active:scale-[0.98] ${
                        sel
                          ? "bg-copper-500 text-white shadow-copper"
                          : "bg-sunken text-forest-700 hover:bg-forest-100"
                      }`}
                    >
                      {BOW_LABELS[b]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBowOverride(true)}
              className="text-xs text-forest-700 dark:text-forest-300 underline"
            >
              Andere Bogenklasse wählen…
            </button>
          )}

          {/* Peg + Distance only for 3D */}
          {/* target_practice: Konfigurations-Sektion statt Pflock/Parcours */}
          {discipline === "target_practice" && (
            <div className="space-y-4 card-sunken">
              <h2 className="eyebrow flex items-center gap-1.5">Scheiben-Setup</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary mb-1 block">Pfeile pro Aufnahme</label>
                  <input type="number" inputMode="numeric" min={1} max={20} className="input"
                    value={tpArrowsPerEnd} onChange={(e) => setTpArrowsPerEnd(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Anzahl Aufnahmen</label>
                  <input type="number" inputMode="numeric" min={1} max={50} className="input"
                    value={tpNumEnds} onChange={(e) => setTpNumEnds(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Distanz (m)</label>
                  <input type="number" inputMode="numeric" min={1} max={200} className="input"
                    value={tpDistance} onChange={(e) => setTpDistance(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Ringe der Scheibe</label>
                  <input type="number" inputMode="numeric" min={3} max={12} className="input"
                    value={tpRings} onChange={(e) => setTpRings(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Wertung</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["points", "legs", "sets"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTpScoringMode(m)}
                      className={`py-2 rounded-lg text-xs font-medium tap-target transition ${
                        tpScoringMode === m
                          ? "bg-cherry-500 text-cream"
                          : "bg-surface text-secondary border border-hairline"
                      }`}
                    >
                      {m === "points" ? "Gesamtsumme" : m === "legs" ? "Best of Legs" : "Sets & Legs"}
                    </button>
                  ))}
                </div>
              </div>
              {tpScoringMode !== "points" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-secondary mb-1 block">Legs zum Sieg</label>
                    <input type="number" inputMode="numeric" min={1} max={20} className="input"
                      value={tpLegsToWin} onChange={(e) => setTpLegsToWin(e.target.value)} />
                  </div>
                  {tpScoringMode === "sets" && (
                    <div>
                      <label className="text-xs text-secondary mb-1 block">Sets zum Sieg</label>
                      <input type="number" inputMode="numeric" min={1} max={10} className="input"
                        value={tpSetsToWin} onChange={(e) => setTpSetsToWin(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Eingabe bei Multi-Player</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["solo", "collab"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTpSharedMode(m)}
                      className={`py-2 rounded-lg text-xs font-medium tap-target transition ${
                        tpSharedMode === m
                          ? "bg-cherry-500 text-cream"
                          : "bg-surface text-secondary border border-hairline"
                      }`}
                    >
                      {m === "solo" ? "Einer scort" : "Jeder selbst"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  {tpSharedMode === "solo"
                    ? "Owner scort für alle Spieler — Reihenfolge wechselt pro Leg."
                    : "Jeder Spieler scort am eigenen Handy. Alle sehen die Marker aller Schützen live."}
                </p>
              </div>
              <p className="text-xs text-muted">
                Multi-Player über Freund hinzufügen oder QR-Code im Training-Detail.
              </p>
            </div>
          )}

          {is3d && (
            <>
              <div>
                <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
                  {t("training:wizard.select_peg")}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setPegColor("")}
                    className={`tap-target rounded-xl px-2 py-3 text-xs font-medium transition ${
                      pegColor === "" ? "bg-forest-700 text-white" : "bg-sunken text-forest-700"
                    }`}
                  >
                    —
                  </button>
                  {PEGS.map((p) => {
                    const sel = p === pegColor;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPegColor(p)}
                        className={`tap-target rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition active:scale-[0.95] ${
                          sel ? "ring-2 ring-copper-500" : ""
                        }`}
                        style={{ backgroundColor: PEG_COLORS_HEX[p] === "#FFFFFF" ? "#F1EDE3" : PEG_COLORS_HEX[p] + "20" }}
                      >
                        <span
                          className="w-5 h-5 rounded-full border-2 border-white/50"
                          style={{ backgroundColor: PEG_COLORS_HEX[p] }}
                        />
                        <span className="text-[10px] font-medium text-forest-900">{PEG_LABELS[p].split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
                  {t("training:wizard.distance_mode")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDistanceMode("")}
                    className={`tap-target rounded-xl px-3 py-3 text-sm font-medium transition ${
                      distanceMode === "" ? "bg-forest-700 text-white" : "bg-sunken text-forest-700"
                    }`}
                  >
                    {t("training:wizard.distance_unset")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistanceMode("marked")}
                    className={`tap-target rounded-xl px-3 py-3 text-sm font-medium transition ${
                      distanceMode === "marked" ? "bg-copper-500 text-white" : "bg-sunken text-forest-700"
                    }`}
                  >
                    {t("training:wizard.distance_marked")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistanceMode("unmarked")}
                    className={`tap-target rounded-xl px-3 py-3 text-sm font-medium transition ${
                      distanceMode === "unmarked" ? "bg-copper-500 text-white" : "bg-sunken text-forest-700"
                    }`}
                  >
                    {t("training:wizard.distance_unmarked")}
                  </button>
                </div>
              </div>

              {/* Parcours */}
              {parcoursOptions.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
                    {t("training:wizard.select_parcours")}
                  </label>
                  <select
                    className="input"
                    value={parcoursId ?? ""}
                    onChange={(e) => {
                      setParcoursId(e.target.value ? Number(e.target.value) : null);
                      setStartLane(1);
                    }}
                  >
                    <option value="">—</option>
                    {parcoursOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.lanes_detailed_count > 0 ? ` (${p.lanes_detailed_count} Bahnen)` : ""}
                      </option>
                    ))}
                  </select>
                  {/* Start-Bahn-Picker: nur bei Parcours mit detaillierten Bahnen */}
                  {(() => {
                    const selected = parcoursOptions.find((p) => p.id === parcoursId);
                    if (!selected || selected.lanes_detailed_count <= 1) return null;
                    const total = selected.lanes_detailed_count;
                    return (
                      <div className="mt-3">
                        <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
                          Startbahn (optional)
                        </label>
                        <select
                          className="input"
                          value={startLane}
                          onChange={(e) => setStartLane(Number(e.target.value))}
                        >
                          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>Bahn {n}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted mt-1">
                          Stationen werden ab dieser Bahn der Reihe nach vorbereitet.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          <button onClick={() => setStep(3)} className="btn w-full tap-large">
            {t("common:actions.next")} <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <header className="text-center mb-2">
            <h1 className="font-display text-2xl font-semibold mb-1">{t("training:wizard.step3_title")}</h1>
            <p className="text-sm text-forest-700 dark:text-forest-300">{t("training:wizard.step3_subtitle")}</p>
          </header>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("training:wizard.location")}
            </label>
            <input
              className="input"
              placeholder={t("training:wizard.location_placeholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            {recentLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recentLocations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      location === loc
                        ? "bg-copper-500 text-white"
                        : "bg-sunken dark:bg-sunken-dark text-forest-700 dark:text-forest-300"
                    }`}
                  >
                    <MapPin size={11} /> {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              {t("training:wizard.notes")}
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder={t("training:wizard.notes_placeholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>
          )}

          <button onClick={submit} className="btn w-full tap-large inline-flex items-center justify-center gap-2 disabled:opacity-60" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} strokeWidth={2.25} className="animate-spin" />
                {t("training:wizard.starting")}
              </>
            ) : (
              <>
                {t("training:wizard.start")} <Check size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
