import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { addFavorite, listFavorites, removeFavorite, type FavoriteKind } from "../api/favorites";

type Props = {
  kind: FavoriteKind;
  /** Referenz-String (z.B. parcours-id, discipline-key, bow-type-key).
   * Heißt `refValue` weil `ref` in React ein reservierter Prop-Name ist. */
  refValue: string;
  /** sm = 14px, md = 18px, lg = 22px */
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

/**
 * Stern-Toggle für Favoriten. Hält den Zustand selbst (initial via listFavorites).
 * Optimistic-Update beim Tippen.
 */
export default function FavoriteButton({ kind, refValue, size = "md", className = "", label }: Props) {
  const px = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    listFavorites()
      .then((r) => {
        if (!mounted) return;
        setActive(r.favorites.some((f) => f.kind === kind && f.ref === refValue));
      })
      .catch(() => mounted && setActive(false));
    return () => {
      mounted = false;
    };
  }, [kind, refValue]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (active === null) return;
    const next = !active;
    setActive(next);
    try {
      if (next) await addFavorite(kind, refValue);
      else await removeFavorite(kind, refValue);
    } catch {
      setActive(!next); // rollback
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-1 -m-1 transition active:scale-90 no-tap-highlight ${className}`}
      aria-label={label ?? (active ? "Favorit entfernen" : "Als Favorit speichern")}
      title={label ?? (active ? "Favorit entfernen" : "Als Favorit speichern")}
    >
      <Star
        size={px}
        strokeWidth={1.5}
        className={active ? "fill-gold text-gold" : "text-muted"}
      />
    </button>
  );
}
