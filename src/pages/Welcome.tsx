import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Target, Users, Trophy, BarChart3, Loader2, Crosshair } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { createBow, type Bow } from "../api/bows";
import type { BowType } from "../api/trainings";
import { BOW_LABELS } from "../api/trainings";
import { RecurveBowSVG, CompoundBowSVG, BarebowSVG, TraditionalBowSVG } from "./help/HelpIllustrations";

/**
 * Onboarding-Wizard für neue User. 5 Schritte:
 *  1. Willkommen + App-Pitch
 *  2. Display-Name (vorhanden falls Registrierung gesetzt)
 *  3. Bogenklasse + erster Bogen anlegen
 *  4. Disziplin-Präferenz (kein commitment, nur Hinweis was die App kann)
 *  5. CTA — "Erstes Training starten" oder "Erstmal umsehen"
 *
 * Sicherheit: User kann das Onboarding nicht überspringen über die URL —
 * `RequireAuth` in App.tsx redirected zurück solange onboarding_completed_at NULL ist.
 */
export default function Welcome() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [bowType, setBowType] = useState<BowType | null>(null);
  const [bowName, setBowName] = useState("");
  const [interest, setInterest] = useState<"3d" | "field" | "target" | "any" | null>(null);

  // Wenn user schon Onboarding abgeschlossen hat (z.B. zurück über URL): direkt raus.
  if (user?.onboarding_completed_at) {
    nav("/", { replace: true });
    return null;
  }

  const totalSteps = 5;
  const canNext = (() => {
    if (step === 0) return true;
    if (step === 1) return displayName.trim().length >= 2;
    if (step === 2) return !!bowType;
    if (step === 3) return !!interest;
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

  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Progress-Indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-cherry-500" : "bg-hairline"}`}
            aria-hidden
          />
        ))}
      </div>

      <div className="card space-y-5 min-h-[400px] flex flex-col">
        {step === 0 && <StepWelcome />}
        {step === 1 && (
          <StepDisplayName
            value={displayName}
            onChange={setDisplayName}
            initialFromEmail={user?.email ?? null}
          />
        )}
        {step === 2 && (
          <StepBowChoice
            type={bowType}
            name={bowName}
            onTypeChange={setBowType}
            onNameChange={setBowName}
          />
        )}
        {step === 3 && <StepInterest value={interest} onChange={setInterest} />}
        {step === 4 && <StepDone />}

        {error && <div className="text-sm text-cherry-600">{error}</div>}

        <div className="flex-1" />

        <div className="flex items-center justify-between gap-2 pt-2">
          {step > 0 ? (
            <button onClick={back} disabled={busy} className="btn-ghost inline-flex items-center gap-1.5">
              <ArrowLeft size={16} strokeWidth={1.75} /> Zurück
            </button>
          ) : (
            <span />
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="btn-accent inline-flex items-center gap-1.5"
            >
              Weiter <ArrowRight size={16} strokeWidth={2} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => complete(false)}
                disabled={busy}
                className="btn-secondary inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
                Erstmal umsehen
              </button>
              <button
                onClick={() => complete(true)}
                disabled={busy}
                className="btn-accent inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} strokeWidth={2} />}
                Erstes Training
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-secondary text-center mt-4">
        Schritt {step + 1} von {totalSteps}
      </p>
    </div>
  );
}

// ─── Step 0: Willkommen ─────────────────────────────────────────────────────
function StepWelcome() {
  return (
    <>
      <h1 className="display text-h1">Willkommen bei Archerries</h1>
      <p className="text-secondary">
        Die App ist dein digitales Schießbuch — sie ersetzt den Zettel auf dem 3D-Parcours,
        die Excel-Tabelle für Halle und die Notiz-App für Distanzschätzungen.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <Highlight
          icon={<Target size={20} strokeWidth={1.75} />}
          title="Alle Disziplinen"
          desc="3D, Feldbogen, Halle, FITA — mit korrekter Wertung"
        />
        <Highlight
          icon={<Users size={20} strokeWidth={1.75} />}
          title="Geteilte Runden"
          desc="Per QR-Code Freunde dazuholen, parallel scoren"
        />
        <Highlight
          icon={<BarChart3 size={20} strokeWidth={1.75} />}
          title="Statistiken"
          desc="Trefferbilder, Heatmaps, Pfeil-Konsistenz"
        />
        <Highlight
          icon={<Trophy size={20} strokeWidth={1.75} />}
          title="Highscores"
          desc="Wettbewerb mit anderen Schützen pro Parcours"
        />
      </div>

      <p className="text-secondary text-sm mt-2">
        In den nächsten Schritten richten wir dich kurz ein — dauert keine Minute.
      </p>
    </>
  );
}

function Highlight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-sunken">
      <div className="flex items-center gap-2 text-cherry-500 mb-1">{icon}<span className="font-semibold text-primary text-sm">{title}</span></div>
      <div className="text-xs text-secondary">{desc}</div>
    </div>
  );
}

// ─── Step 1: Display-Name ───────────────────────────────────────────────────
function StepDisplayName({
  value,
  onChange,
  initialFromEmail,
}: {
  value: string;
  onChange: (v: string) => void;
  initialFromEmail: string | null;
}) {
  return (
    <>
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

// ─── Step 2: Bogenklasse ───────────────────────────────────────────────────
function StepBowChoice({
  type,
  name,
  onTypeChange,
  onNameChange,
}: {
  type: BowType | null;
  name: string;
  onTypeChange: (t: BowType) => void;
  onNameChange: (n: string) => void;
}) {
  const opts: Array<{ t: BowType; svg: React.ReactNode; peg: string; hint: string }> = [
    { t: "recurve",     svg: <RecurveBowSVG size={50} />,     peg: "Blau", hint: "Olympia-Bogen mit Visier" },
    { t: "compound",    svg: <CompoundBowSVG size={50} />,    peg: "Blau", hint: "Cams + Scope, max Präzision" },
    { t: "barebow",     svg: <BarebowSVG size={50} />,        peg: "Rot",  hint: "Recurve ohne Visier" },
    { t: "traditional", svg: <TraditionalBowSVG size={50} />, peg: "Rot",  hint: "Lang, Trad, Instinktiv" },
  ];
  return (
    <>
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

// ─── Step 3: Disziplin-Interesse ────────────────────────────────────────────
function StepInterest({
  value,
  onChange,
}: {
  value: "3d" | "field" | "target" | "any" | null;
  onChange: (v: "3d" | "field" | "target" | "any") => void;
}) {
  const opts = [
    { k: "3d" as const,     label: "3D-Parcours",     desc: "Tier­attrappen im Wald, WA/IFAA/Bowhunter" },
    { k: "field" as const,  label: "Feldbogen",       desc: "Ringauflagen im Wald, WA/IFAA" },
    { k: "target" as const, label: "Scheibenschießen", desc: "Halle, FITA Outdoor" },
    { k: "any" as const,    label: "Alles ein bisschen", desc: "Keine Festlegung" },
  ];
  return (
    <>
      <h2 className="display text-h2">Was interessiert dich am meisten?</h2>
      <p className="text-secondary">
        Das hilft uns, dir relevante Disziplinen vorzuschlagen. Du kannst alles immer schießen — die App schränkt nichts ein.
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

// ─── Step 4: Done ──────────────────────────────────────────────────────────
function StepDone() {
  return (
    <>
      <div className="flex items-center gap-2 text-cherry-500 text-xs uppercase tracking-wider">
        <Crosshair size={14} strokeWidth={1.75} /> Fertig
      </div>
      <h2 className="display text-h2">Alles eingerichtet</h2>
      <p className="text-secondary">
        Du kannst jetzt direkt ein Training starten — wir zeigen dir während der ersten Runde
        Tooltips wo es Sinn macht. Oder schau dich erst um (Dashboard, Hilfe, Parcours-Liste).
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
