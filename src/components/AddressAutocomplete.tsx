import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { searchAddresses, formatAddress, type GeocodeResult } from "../lib/geocode";

type Props = {
  value: string;
  onChange: (newAddress: string) => void;
  /** Wird zusätzlich gerufen wenn ein Vorschlag ausgewählt wird — Koordinaten kommen mit */
  onSelectLocation?: (lat: number, lng: number, formatted: string) => void;
  placeholder?: string;
  id?: string;
};

/**
 * Adresseingabe mit Live-Vorschlägen via Nominatim (OSM).
 * Debounced (350ms), max 5 Treffer. Click auf Vorschlag setzt Adresse + ruft onSelectLocation.
 */
export default function AddressAutocomplete({ value, onChange, onSelectLocation, placeholder, id }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [hovered, setHovered] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const r = await searchAddresses(value, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setResults(r);
          setOpen(r.length > 0);
          setHovered(0);
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.warn("[address] search error", e);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
  }, [value]);

  // Click-Outside-Handler
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (r: GeocodeResult) => {
    justSelectedRef.current = true;
    const formatted = formatAddress(r.address) || r.display_name;
    onChange(formatted);
    onSelectLocation?.(r.lat, r.lng, formatted);
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHovered((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHovered((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[hovered]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <MapPin size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        id={id}
        type="text"
        className="input pl-10 pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && (
        <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
      )}

      {open && results.length > 0 && (
        <ul
          className="absolute z-30 left-0 right-0 mt-1 rounded-2xl bg-elevated border border-hairline shadow-lift overflow-hidden max-h-80 overflow-y-auto divide-y divide-hairline"
          role="listbox"
        >
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng}`}
              role="option"
              aria-selected={i === hovered}
              onMouseEnter={() => setHovered(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
              className={`px-4 py-2.5 cursor-pointer text-sm transition ${
                i === hovered
                  ? "bg-cherry-50 dark:bg-cherry-900/30 text-primary border-l-2 border-l-cherry-500"
                  : "text-secondary hover:bg-surface/60 border-l-2 border-l-transparent"
              }`}
            >
              <div className="font-medium">{formatAddress(r.address) || r.display_name.split(",")[0]}</div>
              <div className="text-xs text-muted truncate mt-0.5">{r.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
