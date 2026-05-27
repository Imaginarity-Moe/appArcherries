import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { listMyClubs, createClub, joinClub, type Club } from "../api/clubs";
import { PageSpinner } from "../components/Spinner";

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "join" | "create">("none");

  // join-form
  const [code, setCode] = useState("");
  // create-form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyClubs()
      .then((r) => setClubs(r.clubs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await joinClub(code.trim().toUpperCase());
      setClubs((prev) => {
        const exists = prev.some((c) => c.id === r.club.id);
        return exists ? prev : [...prev, r.club].sort((a, b) => a.name.localeCompare(b.name));
      });
      setCode("");
      setMode("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beitreten fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createClub({
        name: name.trim(),
        description: description.trim() || null,
      });
      setClubs((prev) => [...prev, r.club].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDescription("");
      setMode("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <header>
        <h1 className="display text-h1 flex items-center gap-2">
          <Users size={24} strokeWidth={1.75} /> Vereine
        </h1>
        <p className="text-secondary text-sm mt-1">
          Schließ dich mit deinen Mitschützen zusammen. Mit einem Code beitreten oder
          selbst einen Verein gründen.
        </p>
      </header>

      {/* Aktions-Pills */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode(mode === "join" ? "none" : "join"); setError(null); }}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
            mode === "join"
              ? "bg-cherry-500 text-cream border-cherry-500"
              : "bg-surface text-primary border-hairline hover:border-cherry-300"
          }`}
        >
          <KeyRound size={15} strokeWidth={1.75} /> Mit Code beitreten
        </button>
        <button
          onClick={() => { setMode(mode === "create" ? "none" : "create"); setError(null); }}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
            mode === "create"
              ? "bg-cherry-500 text-cream border-cherry-500"
              : "bg-surface text-primary border-hairline hover:border-cherry-300"
          }`}
        >
          <Plus size={15} strokeWidth={1.75} /> Verein gründen
        </button>
      </div>

      {/* Join-Form */}
      {mode === "join" && (
        <form onSubmit={handleJoin} className="card space-y-3 animate-fade-in">
          <h2 className="eyebrow">Einladungs-Code</h2>
          <input
            type="text"
            className="input text-base tracking-widest uppercase text-center font-mono"
            placeholder="AB3FH92K"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
          />
          {error && <div className="text-sm text-cherry-500">{error}</div>}
          <button type="submit" disabled={busy || code.trim().length < 4} className="btn-accent w-full">
            {busy && <Loader2 size={15} className="animate-spin" />} Beitreten
          </button>
        </form>
      )}

      {/* Create-Form */}
      {mode === "create" && (
        <form onSubmit={handleCreate} className="card space-y-3 animate-fade-in">
          <h2 className="eyebrow">Neuer Verein</h2>
          <label className="block">
            <span className="text-xs text-muted">Name</span>
            <input
              type="text"
              className="input mt-1"
              placeholder="z.B. Bogenfreunde Eichwald"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Beschreibung (optional)</span>
            <textarea
              className="input mt-1"
              rows={2}
              placeholder="Worum geht's? Trainings-Tage, Verein-Treffpunkt …"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <div className="text-sm text-cherry-500">{error}</div>}
          <button type="submit" disabled={busy || !name.trim()} className="btn-accent w-full">
            {busy && <Loader2 size={15} className="animate-spin" />} Verein anlegen
          </button>
        </form>
      )}

      {/* Liste */}
      {clubs.length === 0 ? (
        <section className="card text-center py-10 space-y-3">
          <div className="text-5xl">🏹</div>
          <p className="font-semibold text-lg">Noch in keinem Verein</p>
          <p className="text-sm text-secondary max-w-md mx-auto">
            Trag dich mit einem Einladungs-Code in einen bestehenden Verein ein
            oder gründe selbst einen. Im Verein-Highscore tauchen dann nur Mitglieder auf.
          </p>
        </section>
      ) : (
        <section className="space-y-2">
          <h2 className="eyebrow">Meine Vereine ({clubs.length})</h2>
          <ul className="space-y-2">
            {clubs.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/clubs/${c.id}`}
                  className="card flex items-center gap-3 hover:border-cherry-300 transition"
                >
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-cherry-50 dark:bg-cherry-900/30 text-cherry-700 dark:text-cherry-300 flex items-center justify-center">
                    <Users size={20} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {c.name}
                      {c.my_role === "admin" && (
                        <span className="text-[10px] uppercase tracking-wider bg-cherry-100 dark:bg-cherry-900/40 text-cherry-700 dark:text-cherry-200 px-1.5 py-0.5 rounded-full font-semibold">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {c.member_count ?? 1} {(c.member_count ?? 1) === 1 ? "Mitglied" : "Mitglieder"}
                      {c.description ? <> · <span className="truncate inline-block max-w-[40ch] align-bottom">{c.description}</span></> : null}
                    </div>
                  </div>
                  <ArrowRight size={16} strokeWidth={1.75} className="text-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
