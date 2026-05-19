import { FormEvent, useEffect, useState } from "react";
import { Star, Trash2, Loader2 } from "lucide-react";
import {
  deleteParcoursReview,
  listParcoursReviews,
  upsertParcoursReview,
  type ParcoursReview,
} from "../api/parcours";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import { useConfirm } from "./ConfirmDialog";
import { Spinner } from "./Spinner";

type Props = {
  parcoursId: number;
  onAggregateChange?: () => void;
};

/**
 * Reviews-Liste + eigenes Review-Formular für die Parcours-Detail-Page.
 * Owner können auch reviewen (zur Selbstreflexion). Pro User max 1 Review pro Parcours.
 */
export default function ParcoursReviews({ parcoursId, onAggregateChange }: Props) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<ParcoursReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eigenes Review herausfiltern (für Form-Initialisierung + Anzeige-Reihenfolge)
  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;
  const others = user ? reviews.filter((r) => r.user_id !== user.id) : reviews;

  const [rating, setRating] = useState<number>(myReview?.rating ?? 0);
  const [comment, setComment] = useState<string>(myReview?.comment ?? "");

  useEffect(() => {
    listParcoursReviews(parcoursId)
      .then((r) => setReviews(r.reviews))
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, [parcoursId]);

  // Wenn mein Review nachgeladen wird, Form-State synchronisieren
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment ?? "");
    }
  }, [myReview?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError("Bitte 1–5 Sterne vergeben");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await upsertParcoursReview(parcoursId, {
        rating,
        comment: comment.trim() || null,
      });
      // Eigenes Review im State updaten
      setReviews((rs) => {
        const idx = rs.findIndex((x) => x.user_id === r.review.user_id);
        if (idx === -1) return [r.review, ...rs];
        const next = [...rs];
        next[idx] = r.review;
        return next;
      });
      onAggregateChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!myReview) return;
    const ok = await confirm({
      title: "Bewertung löschen?",
      message: "Deine Bewertung und dein Kommentar werden entfernt.",
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteParcoursReview(parcoursId, myReview.id);
      setReviews((rs) => rs.filter((x) => x.id !== myReview.id));
      setRating(0);
      setComment("");
      onAggregateChange?.();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner className="py-4" />;

  return (
    <section className="card space-y-4">
      <h2 className="eyebrow">Bewertungen &amp; Kommentare</h2>

      {/* Eigene Bewertung — Formular */}
      <form onSubmit={handleSubmit} className="space-y-2 pb-4 border-b border-hairline">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          <span>{myReview ? "Deine Bewertung" : "Deine Bewertung abgeben"}</span>
        </div>
        <StarPicker value={rating} onChange={setRating} />
        <textarea
          rows={2}
          maxLength={2000}
          placeholder="Kommentar (optional) — was hat dir gefallen, was nicht?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input text-sm"
        />
        {error && <div className="text-xs text-cherry-500">{error}</div>}
        <div className="flex items-center gap-2">
          <button type="submit" className="btn-accent text-sm" disabled={busy || rating < 1}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {myReview ? "Bewertung aktualisieren" : "Bewertung speichern"}
          </button>
          {myReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="btn-ghost danger text-xs"
            >
              <Trash2 size={14} strokeWidth={1.75} /> Entfernen
            </button>
          )}
        </div>
      </form>

      {/* Andere Bewertungen */}
      {others.length === 0 ? (
        <div className="text-sm text-muted text-center py-2">
          {reviews.length === 0
            ? "Noch keine Bewertungen für diesen Parcours."
            : "Sonst hat hier noch niemand bewertet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {others.map((r) => (
            <li key={r.id} className="flex gap-3">
              <Avatar
                user={{ display_name: r.display_name, avatar_url: r.avatar_url }}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm truncate">
                    {r.display_name ?? "Anonym"}
                  </span>
                  <span className="text-xs text-muted">{fmtRelative(r.updated_at)}</span>
                </div>
                <StarDisplay value={r.rating} size={12} />
                {r.comment && (
                  <p className="text-sm text-primary mt-1 whitespace-pre-wrap">{r.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Sterne-Bewertung">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? n - 1 : n)}
            className="p-1 -m-1 transition active:scale-90"
            aria-label={`${n} ${n === 1 ? "Stern" : "Sterne"}`}
          >
            <Star
              size={22}
              strokeWidth={1.5}
              className={filled ? "fill-gold text-gold" : "text-muted"}
            />
          </button>
        );
      })}
      <span className="text-xs text-muted ml-2 tabular-nums">{value ? `${value}/5` : "—"}</span>
    </div>
  );
}

function StarDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={n <= value ? "fill-gold text-gold" : "text-muted"}
        />
      ))}
    </div>
  );
}

function fmtRelative(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (24 * 3600 * 1000));
  if (days < 1) return "heute";
  if (days < 2) return "gestern";
  if (days < 30) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
