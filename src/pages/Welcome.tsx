import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Check, Target, Users, Trophy, BarChart3, Loader2,
  Crosshair, Map, Crown, Award, Compass, Sparkles,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { createBow, type Bow } from "../api/bows";
import type { BowType } from "../api/trainings";
import { BOW_LABELS } from "../api/trainings";
import {
  RecurveBowSVG, CompoundBowSVG, BarebowSVG, TraditionalBowSVG,
  AnimalTargetSVG, WATargetSVG, FieldWATargetSVG,
  PegStakeSVG,
} from "./help/HelpIllustrations";

/**
 * Onboarding-Wizard mit zwei Modi:
 *  - ?mode=short → 5 Setup-Steps (Name, Bogen, Interesse, Done)
 *  - ?mode=long  → 7 didaktische Lehr-Steps + 4 Setup-Steps = 11 Steps total
 *
 * RequireAuth in App.tsx redirected User mit !onboarding_completed_at hier her.
 */

type Mode = "short" | "long";

type StepKey =
  // LANG-only Lehr-Steps
  | "intro_app"
  | "intro_disciplines"
  | "intro_scoring"
  | "intro_pegs"
  | "intro_bows_overview"
  | "intro_multiplayer"
  | "intro_stats"
  // Beide (Setup)
  | "welcome"
  | "name"
  | "bow_choice"
  | "interest"
  | "done";

const STEPS: Record<Mode, StepKey[]> = {
  short: ["welcome", "name", "bow_choice", "interest", "done"],
  long: [
    "intro_app",
    "intro_disciplines",
    "intro_scoring",
    "intro_pegs",
    "intro_bows_overview",
    "intro_multiplayer",
    "intro_stats",
    "name",
    "bow_choice",
    "interest",
    "done",
  ],
};

export default function Welcome() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [search] = useSearchParams();
  const mode: Mode = search.get("mode") === "long" ? "long" : "short";
  const stepKeys = STEPS[mode];
  const totalSteps = stepKeys.length;

  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State (gemeinsam für beide Modi)
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bowType, setBowType] = useState<BowType | null>(null);
  const [bowName, setBowName] = useState("");
  const [interest, setInterest] = useState<"3d" | "field" | "target" | "any" | null>(null);

  if (user?.onboarding_completed_at) {
    nav("/", { replace: true });
    return null;
  }

  const currentKey = stepKeys[stepIdx];

  const canNext = (() => {
    if (currentKey === "name") return displayName.trim().length >= 2;
    if (currentKey === "bow_choice") return !!bowType;
    if (currentKey === "interest") return !!interest;
    return true;
  })();

  async function saveDisplayName() {
    const v = displayName.trim();
    if (v === (user?.display_name ?? "").trim()) return;
    await api("/me", { method: "PATCH", body: JSON.stringify({ display_name: v }) });
  }

  async function saveBow() {
    if (!bowType) return;
    const name = bowName.trim() || `Mein ${BOW_LABELS[bowType]}`;
    await createBow({ name, bow_type: bowType, is_default: true } as Partial<Bow>);
  }

  async function complete(startTraining: boolean) {
    setBusy(true);
    setError(null);
    try {
      await saveDisplayName();
      await saveBow();
      await api("/me/onboarding/complete", { method: "POST" });
      await refresh();
      nav(startTraining ? "/trainings/new" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Onboarding nicht abschließen");
    } finally {
      setBusy(false);
    }
  }

  const next = () => { setError(null); setStepIdx((s) => Math.min(s + 1, totalSteps - 1)); };
  const back = () => { setError(null); setStepIdx((s) => Math.max(s - 1, 0)); };
  const skipToSetup = () => {
    // LANG: Sprung direkt zu "name"-Step für User, die die Lehr-Sektionen überspringen wollen
    const setupIdx = stepKeys.indexOf("name");
    if (setupIdx >= 0) setStepIdx(setupIdx);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Progress-Indicator */}
      <div className="flex items-center gap-1 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${i <= stepIdx ? "bg-cherry-500" : "bg-hairline"}`}
            aria-hidden
          />
        ))}
      </div>

      <div className="card space-y-5 min-h-[400px] flex flex-col">
        {currentKey === "intro_app"           && <StepIntroApp />}
        {currentKey === "intro_disciplines"   && <StepIntroDisciplines />}
        {currentKey === "intro_scoring"       && <StepIntroScoring />}
        {currentKey === "intro_pegs"          && <StepIntroPegs />}
        {currentKey === "intro_bows_overview" && <StepIntroBowsOverview />}
        {currentKey === "intro_multiplayer"   && <StepIntroMultiplayer />}
        {currentKey === "intro_stats"         && <StepIntroStats />}
        {currentKey === "welcome"             && <StepWelcomeShort />}
        {currentKey === "name"                && <StepName value={displayName} onChange={setDisplayName} initialFromEmail={user?.email ?? null} />}
        {currentKey === "bow_choice"          && <StepBow type={bowType} name={bowName} onTypeChange={setBowType} onNameChange={setBowName} />}
        {currentKey === "interest"            && <StepInterest value={interest} onChange={setInterest} />}
        {currentKey === "done"                && <StepDone mode={mode} />}

        {error && <div className="text-sm text-cherry-600">{error}</div>}

        <div className="flex-1" />

        {/* Skip-Button im LANG-Modus für Lehr-Steps */}
        {mode === "long" && currentKey.startsWith("intro_") && (
          <button onClick={skipToSetup} className="text-xs text-secondary hover:text-primary underline self-center">
            Lehrstoff überspringen → direkt zum Setup
          </button>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {stepIdx > 0 ? (
            <button onClick={back} disabled={busy} className="btn-ghost inline-flex items-center gap-1.5">
              <ArrowLeft size={16} strokeWidth={1.75} /> Zurück
            </button>
          ) : <span />}
          {stepIdx < totalSteps - 1 ? (
            <button onClick={next} disabled={!canNext} className="btn-accent inline-flex items-center gap-1.5">
              Weiter <ArrowRight size={16} strokeWidth={2} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => complete(false)} disabled={busy} className="btn-secondary inline-flex items-center gap-1.5">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
                Erstmal umsehen
              </button>
              <button onClick={() => complete(true)} disabled={busy} className="btn-accent inline-flex items-center gap-1.5">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} strokeWidth={2} />}
                Erstes Training
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-secondary text-center mt-4">
        Schritt {stepIdx + 1} von {totalSteps}
        {mode === "long" && <> · Ausführliche Tour</>}
      </p>
    </div>
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  SHORT-MODUS: Step-Komponenten (Setup-Fokus)                              ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function StepWelcomeShort() {
  return (
    <>
      <Eyebrow>Schnellstart</Eyebrow>
      <h1 className="display text-h1">Willkommen bei Archerries</h1>
      <p className="text-secondary">
        Die App ist dein digitales Schießbuch — sie ersetzt den Zettel auf dem 3D-Parcours,
        die Excel-Tabelle für Halle und die Notiz-App für Distanzschätzungen.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Highlight icon={<Target size={20} strokeWidth={1.75} />}    title="Alle Disziplinen"  desc="3D, Feldbogen, Halle, FITA — korrekte Wertung" />
        <Highlight icon={<Users size={20} strokeWidth={1.75} />}     title="Geteilte Runden"   desc="Per QR-Code Freunde dazuholen" />
        <Highlight icon={<BarChart3 size={20} strokeWidth={1.75} />} title="Statistiken"       desc="Trefferbilder, Heatmaps, Pfeil-Konsistenz" />
        <Highlight icon={<Trophy size={20} strokeWidth={1.75} />}    title="Highscores"        desc="Wettbewerb mit anderen Schützen pro Parcours" />
      </div>
      <p className="text-secondary text-sm mt-2">
        In den nächsten Schritten richten wir dich kurz ein — dauert keine Minute.
      </p>
    </>
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  LONG-MODUS: Lehr-Komponenten (didaktischer Inhalt)                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function StepIntroApp() {
  return (
    <>
      <Eyebrow icon={<Sparkles size={12} />}>Tour 1 / 7</Eyebrow>
      <h1 className="display text-h1">Was ist Archerries?</h1>
      <p className="text-secondary">
        Eine Web-App für Bogen­schützen, die ihre Trainings und Wettkämpfe digital erfassen
        möchten — statt Papier­zetteln auf dem Parcours, statt Excel-Tabellen für Halle.
      </p>

      <div className="card-sunken space-y-3 mt-1">
        <ConceptRow
          icon={<Target size={20} className="text-cherry-500" />}
          title="Pfeil-genaue Erfassung"
          desc={"Pro Station / Aufnahme markierst du jeden Pfeil — Zone, Foto-Marker oder Pad-Position. Die App rechnet automatisch nach der gewählten Disziplin (3D-WA / IFAA / Bowhunter / Field, …)."}
        />
        <ConceptRow
          icon={<Map size={20} className="text-cherry-500" />}
          title="Parcours-Datenbank"
          desc={"Lege deinen Hausparcours an oder schaue, was andere User öffentlich geteilt haben. Pro Bahn: Tier, Distanzen pro Pflockfarbe, Notizen, Foto."}
        />
        <ConceptRow
          icon={<Users size={20} className="text-cherry-500" />}
          title="Geteilte Runden"
          desc={"Lade Freunde per QR-Code zu deinem Training ein — sie scoren auf ihrem eigenen Handy mit, du siehst alle Scores live. Auch Gäste ohne Account."}
        />
        <ConceptRow
          icon={<BarChart3 size={20} className="text-cherry-500" />}
          title="Statistik"
          desc={"Treffer-Heatmaps, Pfeil-Konsistenz über die Zeit, Highscores pro Disziplin und Bogenklasse. Optional Veröffentlichung im Community-Highscore."}
        />
      </div>

      <p className="text-xs text-secondary italic">
        Die App läuft offline (PWA, installierbar) — Daten werden synchronisiert, sobald du wieder online bist.
      </p>
    </>
  );
}

function StepIntroDisciplines() {
  return (
    <>
      <Eyebrow icon={<Sparkles size={12} />}>Tour 2 / 7</Eyebrow>
      <h1 className="display text-h1">Drei große Disziplin-Familien</h1>
      <p className="text-secondary">
        Bogensport wird je nach Veranstalter unterschiedlich gewertet. Die App unterstützt
        alle gängigen Systeme — hier die wichtigsten drei Familien:
      </p>

      <div className="card-sunken">
        <div className="flex gap-3 items-start">
          <AnimalTargetSVG size={120} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">3D-Parcours</h3>
            <p className="text-sm text-secondary mt-0.5">
              Lebensgroße Tier­attrappen aus Hartschaum im Wald (typisch 14–28 Stationen).
              Gewertet wird die Trefferzone: Inner Kill (höchste Punkte), Outer Kill, Wound,
              Miss.
            </p>
            <p className="text-xs text-muted mt-1.5">
              Wertungen: 3D-WA, 3D-IFAA Standard / Hunter / Animal, 3D-Bowhunter
            </p>
          </div>
        </div>
      </div>

      <div className="card-sunken">
        <div className="flex gap-3 items-start">
          <FieldWATargetSVG size={120} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">Feldbogen</h3>
            <p className="text-sm text-secondary mt-0.5">
              Klassische Ringauflagen auf Holzscheiben, verteilt im Wald — kein Tier, nur
              Ringkern. Gewertet wird der Ring (6/5/4/3/2/1).
            </p>
            <p className="text-xs text-muted mt-1.5">
              Wertungen: Feldbogen-WA, Feldbogen-IFAA (Field &amp; Hunter)
            </p>
          </div>
        </div>
      </div>

      <div className="card-sunken">
        <div className="flex gap-3 items-start">
          <WATargetSVG size={120} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">Scheibenschießen / Halle</h3>
            <p className="text-sm text-secondary mt-0.5">
              WA-Standardauflage mit 10 Ringen — Halle, FITA-Outdoor. Du wählst Pfeile pro
              Aufnahme, Anzahl Aufnahmen, Distanz und Ringzahl frei.
            </p>
            <p className="text-xs text-muted mt-1.5">
              Wertungen: Gesamtsumme, Best-of-Legs (Darts-Style), Sets &amp; Legs (Match)
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-secondary italic">
        Volldetails inkl. Punktetabellen findest du später unter <b>Hilfe → Wertungssysteme</b>.
      </p>
    </>
  );
}

function StepIntroScoring() {
  return (
    <>
      <Eyebrow icon={<Award size={12} />}>Tour 3 / 7</Eyebrow>
      <h1 className="display text-h1">Wie funktioniert die Wertung?</h1>
      <p className="text-secondary">
        Die Logik unterscheidet sich pro Disziplin. Hier die wichtigsten Konzepte:
      </p>

      <div className="card-sunken space-y-2">
        <h3 className="font-semibold text-sm">Wo trifft der Pfeil? — Zone bestimmt die Punkte</h3>
        <p className="text-sm text-secondary">
          Im 3D: <b>Inner Kill</b> (innerstes Vital) → <b>Outer Kill</b> (umliegender Vital­bereich)
          → <b>Wound</b> (Körper außerhalb der Kills) → <b>Miss</b> (Daneben, Horn, Huf).
        </p>
        <p className="text-sm text-secondary">
          Beim Feldbogen / Halle zählst du Ringe: Mitte ist am wertvollsten, äußere Ringe weniger.
        </p>
      </div>

      <div className="card-sunken space-y-2">
        <h3 className="font-semibold text-sm">Reihenfolge der Pfeile — IFAA-Spezialregel</h3>
        <p className="text-sm text-secondary">
          Bei <b>IFAA Standard, IFAA Animal und Bowhunter</b> schießt du bis zu 3 Pfeile pro Tier —
          aber <b>nur der erste treffende Pfeil zählt</b>. Verfehlst du mit Pfeil 1, gibt's für
          einen Treffer mit Pfeil 2 weniger Punkte. Bei WA-Wertung dagegen zählen alle Pfeile.
        </p>
        <p className="text-xs text-muted italic">
          Beispiel IFAA: Pfeil 1 = Miss, Pfeil 2 = Outer Kill → <b>12 Punkte</b> (nicht 18).
        </p>
      </div>

      <div className="card-sunken space-y-2">
        <h3 className="font-semibold text-sm">Linien-Regel — wer gewinnt im Zweifel?</h3>
        <p className="text-sm text-secondary">
          Bei WA zählt die <b>höhere Zone</b> (Berührung der Linie reicht für die bessere
          Wertung). Bei IFAA zählt die <b>niedrigere Zone</b> (Pfeil muss die Linie
          eindeutig durchbrechen).
        </p>
      </div>

      <p className="text-xs text-secondary italic">
        Die App rechnet alles automatisch — du brauchst dir die Tabellen nicht zu merken,
        nur die Disziplin beim Anlegen richtig zu wählen.
      </p>
    </>
  );
}

function StepIntroPegs() {
  const pegs = [
    { color: "#3B82F6", label: "Blau",  hint: "Visiere — Recurve + Visier, Compound" },
    { color: "#DC2626", label: "Rot",   hint: "Trad / Blank — Lang, Instinktiv, Barebow" },
    { color: "#F5C137", label: "Gelb",  hint: "Jugend" },
    { color: "#FFFFFF", label: "Weiß",  hint: "Kinder / Anfänger" },
  ];
  return (
    <>
      <Eyebrow icon={<Compass size={12} />}>Tour 4 / 7</Eyebrow>
      <h1 className="display text-h1">Pflöcke &amp; Distanzen</h1>
      <p className="text-secondary">
        Auf 3D-Parcours markieren farbige Pflöcke die Position, von der du schießt. Welcher
        Pflock für dich gilt, hängt von deiner Bogenklasse ab.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {pegs.map((p) => (
          <div key={p.label} className="card-sunken text-center">
            <PegStakeSVG color={p.color} label={p.label} size={56} />
            <div className="font-semibold text-sm mt-1">{p.label}</div>
            <div className="text-xs text-muted">{p.hint}</div>
          </div>
        ))}
      </div>

      <div className="card-sunken">
        <h3 className="font-semibold text-sm mb-1.5">Markierte vs. unmarkierte Distanzen</h3>
        <p className="text-sm text-secondary">
          <b>Markiert</b> = Distanz steht am Pflock (z.B. „14 m"). <b>Unmarkiert</b> = du musst
          schätzen. Klassische 3D-Disziplinen wie IFAA-Hunter sind unmarkiert — die App speichert
          deine Schätzungen pro Bahn, damit du beim nächsten Besuch besser schätzt.
        </p>
      </div>
    </>
  );
}

function StepIntroBowsOverview() {
  return (
    <>
      <Eyebrow icon={<Crown size={12} />}>Tour 5 / 7</Eyebrow>
      <h1 className="display text-h1">Vier Bogenklassen</h1>
      <p className="text-secondary">
        Die Klasse bestimmt Pflockfarbe, typische Disziplinen und Highscore-Gruppierung. Du
        wählst gleich deine Hauptklasse — du kannst aber später beliebig viele Bögen hinzufügen.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <BowMiniCard svg={<RecurveBowSVG size={50} />}     name="Recurve"     hint="Visier + Stabilisator" peg="Blau" />
        <BowMiniCard svg={<CompoundBowSVG size={50} />}    name="Compound"    hint="Cams + Scope" peg="Blau" />
        <BowMiniCard svg={<BarebowSVG size={50} />}        name="Barebow"     hint="Recurve ohne Visier" peg="Rot" />
        <BowMiniCard svg={<TraditionalBowSVG size={50} />} name="Traditionell" hint="Lang / Instinktiv" peg="Rot" />
      </div>

      <div className="card-sunken text-sm">
        <p className="font-semibold mb-1">Pro-Tipp für Mehr-Bogen-Schützen</p>
        <p className="text-secondary">
          Du schießt mehrere Klassen? Lege pro Klasse einen Bogen an — dann bleiben Statistiken,
          Highscores und Bestzeiten sauber pro Klasse getrennt. Du wechselst beim Anlegen eines
          Trainings einfach den Bogen.
        </p>
      </div>
    </>
  );
}

function StepIntroMultiplayer() {
  return (
    <>
      <Eyebrow icon={<Users size={12} />}>Tour 6 / 7</Eyebrow>
      <h1 className="display text-h1">Geteilte Runden</h1>
      <p className="text-secondary">
        Bogenschießen ist meistens Team-Sport. Die App lässt dich Freunde direkt zum Training
        einladen — sie scoren auf ihrem eigenen Handy mit.
      </p>

      <div className="card-sunken space-y-2">
        <h3 className="font-semibold text-sm">So funktioniert's</h3>
        <ol className="list-decimal pl-5 text-sm text-secondary space-y-1">
          <li>Du legst ein Training an und bist automatisch <b>Owner</b>.</li>
          <li>Du klickst auf <b>„Freund"</b> (akzeptierte Freundschaften) oder <b>„QR"</b> (für Gäste ohne Account).</li>
          <li>Die anderen scannen den QR oder klicken den Link — sie sind sofort drin.</li>
          <li>Alle Spieler scoren parallel — du siehst alle Scores live.</li>
        </ol>
      </div>

      <div className="card-sunken">
        <h3 className="font-semibold text-sm mb-1">Score-Modi für Multi-Player</h3>
        <ul className="text-sm text-secondary list-disc pl-5 space-y-0.5">
          <li><b>Einer scort</b> — Owner trägt für alle ein (eines Handy reicht)</li>
          <li><b>Jeder selbst</b> — jeder am eigenen Handy, parallel</li>
        </ul>
      </div>

      <p className="text-xs text-secondary italic">
        Auch Gäste ohne Account können mitspielen — sie bekommen einen Token-Link, kein Passwort.
      </p>
    </>
  );
}

function StepIntroStats() {
  return (
    <>
      <Eyebrow icon={<BarChart3 size={12} />}>Tour 7 / 7</Eyebrow>
      <h1 className="display text-h1">Was sieht die App über dich?</h1>
      <p className="text-secondary">
        Mit jedem erfassten Pfeil baut die App dein persönliches Trefferbild auf — bewusst nur
        privat, du entscheidest selbst, was du veröffentlichst.
      </p>

      <div className="card-sunken space-y-2">
        <h3 className="font-semibold text-sm">Was wird automatisch ausgewertet?</h3>
        <ul className="list-disc pl-5 text-sm text-secondary space-y-0.5">
          <li><b>Treffer-Heatmaps</b> pro Tier+Distanz oder pro Bahn — siehst du, wo du systematisch danebenschießt</li>
          <li><b>Pfeil-Konsistenz</b> — der 3. Pfeil sitzt oft schlechter als der 1.? Die Auswertung zeigt's</li>
          <li><b>Schätzdistanzen</b> — wie gut du auf unmarkierten Parcours schätzt</li>
          <li><b>Score-Verlauf</b> — pro Disziplin und Bogenklasse über die Zeit</li>
        </ul>
      </div>

      <div className="card-sunken">
        <h3 className="font-semibold text-sm mb-1">Datenschutz</h3>
        <p className="text-sm text-secondary">
          Statistiken bleiben standardmäßig <b>privat</b>. Nur wenn du ein Training in den
          öffentlichen Highscore aufnimmst, sehen andere User deinen Score + Anzeigename +
          Bogenklasse. Notizen, Standort, einzelne Pfeile bleiben privat.
        </p>
      </div>

      <p className="text-sm text-secondary text-center pt-2">
        Genug Theorie — jetzt richten wir dich ein.
      </p>
    </>
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  Setup-Komponenten (beide Modi)                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function StepName({
  value, onChange, initialFromEmail,
}: {
  value: string; onChange: (v: string) => void; initialFromEmail: string | null;
}) {
  return (
    <>
      <Eyebrow>Setup 1 / 4</Eyebrow>
      <h2 className="display text-h2">Wie sollen wir dich nennen?</h2>
      <p className="text-secondary">
        Dein Anzeigename ist für andere User sichtbar — in geteilten Runden, in Highscores
        und in Parcours-Reviews. E-Mail bleibt privat.
      </p>
      <label className="block">
        <span className="text-xs text-muted uppercase tracking-wider">Anzeigename</span>
        <input
          type="text"
          className="input mt-1.5 text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={120}
          placeholder="z.B. Marie B."
          autoFocus
        />
      </label>
      {initialFromEmail && (
        <p className="text-xs text-muted">
          Registriert unter <span className="font-mono">{initialFromEmail}</span> — nur du siehst diese E-Mail.
        </p>
      )}
    </>
  );
}

function StepBow({
  type, name, onTypeChange, onNameChange,
}: {
  type: BowType | null; name: string;
  onTypeChange: (t: BowType) => void; onNameChange: (n: string) => void;
}) {
  const opts: Array<{ t: BowType; svg: React.ReactNode; peg: string; hint: string }> = [
    { t: "recurve",     svg: <RecurveBowSVG size={50} />,     peg: "Blau", hint: "Olympia-Bogen mit Visier" },
    { t: "compound",    svg: <CompoundBowSVG size={50} />,    peg: "Blau", hint: "Cams + Scope, max Präzision" },
    { t: "barebow",     svg: <BarebowSVG size={50} />,        peg: "Rot",  hint: "Recurve ohne Visier" },
    { t: "traditional", svg: <TraditionalBowSVG size={50} />, peg: "Rot",  hint: "Lang, Trad, Instinktiv" },
  ];
  return (
    <>
      <Eyebrow>Setup 2 / 4</Eyebrow>
      <h2 className="display text-h2">Was schießt du?</h2>
      <p className="text-secondary">
        Wähle deine Hauptklasse — du kannst später weitere Bögen anlegen.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => {
          const sel = o.t === type;
          return (
            <button
              key={o.t}
              type="button"
              onClick={() => onTypeChange(o.t)}
              className={`text-left rounded-2xl border-2 p-3 transition active:scale-[0.98] flex items-start gap-2 ${
                sel ? "border-cherry-500 bg-cherry-50 dark:bg-cherry-900/20" : "border-hairline bg-surface hover:border-hairline-strong"
              }`}
            >
              <div className="shrink-0">{o.svg}</div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{BOW_LABELS[o.t]}</div>
                <div className="text-xs text-secondary mt-0.5">{o.hint}</div>
                <div className="text-xs text-muted mt-0.5">Pflock: <b>{o.peg}</b></div>
              </div>
            </button>
          );
        })}
      </div>
      {type && (
        <label className="block mt-2">
          <span className="text-xs text-muted uppercase tracking-wider">Bogen-Name (optional)</span>
          <input
            type="text"
            className="input mt-1.5"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={`z.B. Mein ${BOW_LABELS[type]}`}
            maxLength={120}
          />
          <p className="text-xs text-muted mt-1">Leerlassen → "Mein {BOW_LABELS[type]}"</p>
        </label>
      )}
    </>
  );
}

function StepInterest({
  value, onChange,
}: {
  value: "3d" | "field" | "target" | "any" | null;
  onChange: (v: "3d" | "field" | "target" | "any") => void;
}) {
  const opts = [
    { k: "3d" as const,     label: "3D-Parcours",      desc: "Tier­attrappen im Wald, WA/IFAA/Bowhunter" },
    { k: "field" as const,  label: "Feldbogen",        desc: "Ringauflagen im Wald, WA/IFAA" },
    { k: "target" as const, label: "Scheibenschießen", desc: "Halle, FITA Outdoor" },
    { k: "any" as const,    label: "Alles ein bisschen", desc: "Keine Festlegung" },
  ];
  return (
    <>
      <Eyebrow>Setup 3 / 4</Eyebrow>
      <h2 className="display text-h2">Was interessiert dich am meisten?</h2>
      <p className="text-secondary">
        Hilft uns, dir relevante Disziplinen vorzuschlagen. Du kannst alles immer schießen — die App schränkt nichts ein.
      </p>
      <div className="space-y-2">
        {opts.map((o) => {
          const sel = o.k === value;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition active:scale-[0.99] ${
                sel ? "border-cherry-500 bg-cherry-50 dark:bg-cherry-900/20" : "border-hairline bg-surface hover:border-hairline-strong"
              }`}
            >
              <div className="font-semibold text-sm">{o.label}</div>
              <div className="text-xs text-secondary">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepDone({ mode }: { mode: Mode }) {
  return (
    <>
      <div className="flex items-center gap-2 text-cherry-500 text-xs uppercase tracking-wider">
        <Crosshair size={14} strokeWidth={1.75} /> {mode === "long" ? "Setup 4 / 4 — Tour beendet" : "Setup 4 / 4"}
      </div>
      <h2 className="display text-h2">Alles eingerichtet</h2>
      <p className="text-secondary">
        Du kannst jetzt direkt ein Training starten — oder dich erst umsehen (Dashboard,
        Parcours-Liste, Hilfe). Den gesamten Wizard findest du jederzeit unter
        <b> Profil → Tour &amp; Hilfe</b>.
      </p>

      <div className="card-sunken text-sm">
        <p className="font-semibold mb-1.5">Was du jetzt machen kannst</p>
        <ul className="list-disc pl-5 space-y-1 text-secondary">
          <li><b>Training starten</b> — auf Parcours oder als Halle/FITA</li>
          <li><b>Parcours suchen</b> — öffentliche Parcours von anderen Usern entdecken</li>
          <li><b>Bogen pflegen</b> — Specs, Pfeil-Sets, Foto unter „Bögen"</li>
          <li><b>Hilfe lesen</b> — Wertungssysteme, Pflöcke, Tipps für Anfänger</li>
        </ul>
      </div>
    </>
  );
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  Generische UI-Bausteine                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function Highlight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-sunken">
      <div className="flex items-center gap-2 text-cherry-500 mb-1">{icon}<span className="font-semibold text-primary text-sm">{title}</span></div>
      <div className="text-xs text-secondary">{desc}</div>
    </div>
  );
}

function ConceptRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-secondary mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function BowMiniCard({ svg, name, hint, peg }: { svg: React.ReactNode; name: string; hint: string; peg: string }) {
  return (
    <div className="card-sunken flex items-center gap-2">
      <div className="shrink-0">{svg}</div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{name}</div>
        <div className="text-xs text-secondary">{hint}</div>
        <div className="text-xs text-muted">Pflock: <b>{peg}</b></div>
      </div>
    </div>
  );
}

function Eyebrow({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-cherry-500">
      {icon} {children}
    </div>
  );
}
