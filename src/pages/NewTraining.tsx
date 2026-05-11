import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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

const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const BOWS = Object.keys(BOW_LABELS) as BowType[];
const PEGS = Object.keys(PEG_LABELS) as PegColor[];

const DISCIPLINE_BLURBS: Record<Discipline, string> = {
  "3d_wa": "11/10/8/5, 2 Pfeile, beide zählen",
  "3d_ifaa": "20/18 → 16/14 → 12/10, nur Erstpfeil",
  "3d_bowhunter": "5/4/3-Wertung, 4 Pfeile",
  "field_wa": "6-5-4-3-2-1, 3 Pfeile pro Auflage",
  simple: "Nur Gesamt-Score, keine Pfeile",
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
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parcoursOptions, setParcoursOptions] = useState<Parcours[]>([]);

  const is3d = discipline.startsWith("3d_");

  useEffect(() => {
    listParcours().then((r) => setParcoursOptions(r.parcours)).catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await createTraining({
        discipline,
        bow_type: bowType,
        peg_color: is3d && pegColor ? (pegColor as PegColor) : null,
        distance_marked: distanceMode === "" ? null : distanceMode === "marked",
        parcours_id: parcoursId,
        location: location || null,
        notes: notes || null,
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
            {DISCIPLINES.map((d) => {
              const sel = d === discipline;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscipline(d)}
                  className={`card text-left tap-large transition active:scale-[0.98] ${
                    sel
                      ? "ring-2 ring-copper-500 bg-copper-50 dark:bg-copper-700/10"
                      : "hover:shadow-lift"
                  }`}
                >
                  <div className="font-display text-base font-semibold mb-1 flex items-center gap-1">
                    {DISCIPLINE_LABELS[d]}
                    {sel && <Check size={16} className="text-copper-500 ml-auto" />}
                  </div>
                  <div className="text-xs text-forest-700 dark:text-forest-300">{DISCIPLINE_BLURBS[d]}</div>
                </button>
              );
            })}
          </div>

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

          {/* Bow */}
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
              {t("training:wizard.select_bow")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BOWS.map((b) => {
                const sel = b === bowType;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBowType(b)}
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

          {/* Peg + Distance only for 3D */}
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
                    onChange={(e) => setParcoursId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">—</option>
                    {parcoursOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
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

          <button onClick={submit} className="btn w-full tap-large" disabled={busy}>
            {busy ? t("training:wizard.starting") : t("training:wizard.start")} <Check size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
