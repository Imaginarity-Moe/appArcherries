import { FormEvent, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import { Star, X, Globe, Mail, Phone, Clock, Coins, Ruler, Calendar, Map as MapIcon } from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";
import {
  TERRAIN_OPTIONS,
  TERRAIN_LABELS,
  type Parcours,
  type TerrainKey,
} from "../api/parcours";
import { reverseGeocode, formatAddress } from "../lib/geocode";

const markerIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 0 C 7 0 0 7 0 16 C 0 26 16 40 16 40 C 16 40 32 26 32 16 C 32 7 25 0 16 0 Z" fill="#8E2C3A"/><circle cx="16" cy="16" r="6" fill="#FAF8F4"/></svg>'
    ),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

export type ParcoursFormState = {
  name: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  lanes_count: string;
  price_info: string;
  opening_hours: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  difficulty: number | null;
  terrain: TerrainKey[];
  peg_blue: boolean;
  peg_red: boolean;
  peg_yellow: boolean;
  peg_white: boolean;
  duration_min: string;
  season_note: string;
  access_note: string;
  last_refresh_date: string;
};

export function initialFormState(p?: Parcours | null): ParcoursFormState {
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    address: p?.address ?? "",
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    is_public: p?.is_public ?? false,
    lanes_count: p?.lanes_count?.toString() ?? "",
    price_info: p?.price_info ?? "",
    opening_hours: p?.opening_hours ?? "",
    website: p?.website ?? "",
    contact_email: p?.contact_email ?? "",
    contact_phone: p?.contact_phone ?? "",
    difficulty: p?.difficulty ?? null,
    terrain: parseTerrain(p?.terrain),
    peg_blue: p?.peg_blue ?? false,
    peg_red: p?.peg_red ?? false,
    peg_yellow: p?.peg_yellow ?? false,
    peg_white: p?.peg_white ?? false,
    duration_min: p?.duration_min?.toString() ?? "",
    season_note: p?.season_note ?? "",
    access_note: p?.access_note ?? "",
    last_refresh_date: p?.last_refresh_date ?? "",
  };
}

function parseTerrain(s: string | null | undefined): TerrainKey[] {
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter((x): x is TerrainKey =>
    (TERRAIN_OPTIONS as readonly string[]).includes(x)
  );
}

/** Konvertiert FormState → API-Body (für POST/PATCH). */
export function formStateToBody(s: ParcoursFormState): Partial<Parcours> {
  return {
    name: s.name.trim(),
    description: s.description.trim() || null,
    address: s.address.trim() || null,
    lat: s.lat,
    lng: s.lng,
    is_public: s.is_public,
    lanes_count: s.lanes_count ? Number(s.lanes_count) : null,
    price_info: s.price_info.trim() || null,
    opening_hours: s.opening_hours.trim() || null,
    website: s.website.trim() || null,
    contact_email: s.contact_email.trim() || null,
    contact_phone: s.contact_phone.trim() || null,
    difficulty: s.difficulty,
    terrain: s.terrain.length > 0 ? s.terrain.join(",") : null,
    peg_blue: s.peg_blue,
    peg_red: s.peg_red,
    peg_yellow: s.peg_yellow,
    peg_white: s.peg_white,
    duration_min: s.duration_min ? Number(s.duration_min) : null,
    season_note: s.season_note.trim() || null,
    access_note: s.access_note.trim() || null,
    last_refresh_date: s.last_refresh_date || null,
  };
}

type Props = {
  state: ParcoursFormState;
  setState: (s: ParcoursFormState) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  /** Optional: zusätzliche Felder am Ende, z.B. Bild-Upload bei NewParcours */
  extraFields?: React.ReactNode;
  /** Optional: ID für das form-Element (damit externe Buttons via form= submitten können) */
  formId?: string;
  /** Optional: internen Submit-Button verstecken (wenn ein externer in der Footer-Nav existiert) */
  hideSubmitButton?: boolean;
  /** Optional: Anzahl bereits detailliert erfasster Bahnen + Parcours-ID für den Link "Bahnen verwalten" */
  lanesDetailedCount?: number;
  parcoursId?: number;
};

export default function ParcoursForm({ state, setState, onSubmit, submitLabel, busy, error, extraFields, formId, hideSubmitButton, lanesDetailedCount, parcoursId }: Props) {
  const update = <K extends keyof ParcoursFormState>(k: K, v: ParcoursFormState[K]) =>
    setState({ ...state, [k]: v });

  const center: [number, number] = state.lat !== null && state.lng !== null ? [state.lat, state.lng] : [51.1657, 10.4515];

  // Bei Marker-Drop: lat/lng setzen + Adresse via Reverse-Geocode füllen
  const handleMarkerSet = async (ll: LatLng) => {
    update("lat", ll.lat);
    update("lng", ll.lng);
    try {
      const r = await reverseGeocode(ll.lat, ll.lng);
      if (r) {
        const addr = formatAddress(r.address) || r.display_name;
        setState({ ...state, lat: ll.lat, lng: ll.lng, address: addr });
      }
    } catch {
      // Geocode-Fehler ignorieren — lat/lng sind ja schon gesetzt
    }
  };

  const toggleTerrain = (k: TerrainKey) => {
    update(
      "terrain",
      state.terrain.includes(k) ? state.terrain.filter((t) => t !== k) : [...state.terrain, k]
    );
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-8">
      {/* ─── Basics ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Basics</h2>
        <Field label="Name *" required>
          <input
            className="input"
            placeholder="z.B. Eichwald Parcours"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field label="Beschreibung">
          <textarea
            className="input"
            rows={3}
            placeholder="Worum geht's? Besondere Merkmale?"
            value={state.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
      </section>

      <div className="hairline" />

      {/* ─── Lage ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Lage</h2>
        <Field label="Adresse">
          <AddressAutocomplete
            value={state.address}
            onChange={(v) => update("address", v)}
            onSelectLocation={(lat, lng) => {
              setState({ ...state, address: state.address, lat, lng });
            }}
            placeholder="Straße suchen oder eintippen…"
          />
        </Field>

        <Field label="Marker auf Karte setzen — Adresse wird automatisch übernommen">
          {/* isolate erzeugt einen eigenen Stacking-Context — Leaflet-z-indices
              (Tiles 200, Overlay-Pane 400, Popup 700, Controls 1000) bleiben
              dadurch lokal und überlagern die Floating-Bottom-Nav (z-30) nicht. */}
          <div className="rounded-2xl overflow-hidden border border-hairline isolate" style={{ height: 280 }}>
            <MapContainer center={center} zoom={state.lat !== null ? 14 : 6} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickToSetMarker onPick={handleMarkerSet} />
              <RecenterOnChange lat={state.lat} lng={state.lng} />
              {state.lat !== null && state.lng !== null && (
                <Marker position={[state.lat, state.lng]} icon={markerIcon} />
              )}
            </MapContainer>
          </div>
          {state.lat !== null && state.lng !== null && (
            <p className="text-xs text-muted mt-1 font-mono">
              {state.lat.toFixed(5)}, {state.lng.toFixed(5)}
            </p>
          )}
        </Field>
      </section>

      <div className="hairline" />

      {/* ─── Details ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Parcours-Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Anzahl Bahnen">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              className="input"
              placeholder="z.B. 28"
              value={state.lanes_count}
              onChange={(e) => update("lanes_count", e.target.value)}
            />
            {parcoursId && lanesDetailedCount !== undefined && (
              <p className="text-xs text-muted mt-1.5">
                {lanesDetailedCount} {state.lanes_count ? `von ${state.lanes_count} ` : ""}
                {lanesDetailedCount === 1 ? "Bahn" : "Bahnen"} detailliert erfasst —{" "}
                <Link to={`/parcours/${parcoursId}/lanes`} className="text-cherry-500 hover:underline">
                  Bahnen verwalten
                </Link>
              </p>
            )}
          </Field>
          <Field label="Geschätzte Dauer (Min)">
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={600}
              step={15}
              className="input"
              placeholder="z.B. 150"
              value={state.duration_min}
              onChange={(e) => update("duration_min", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Schwierigkeit">
          <StarRating value={state.difficulty} onChange={(v) => update("difficulty", v)} />
        </Field>

        <Field label="Geländetyp">
          <div className="flex flex-wrap gap-2">
            {TERRAIN_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTerrain(t)}
                className={`chip transition ${
                  state.terrain.includes(t) ? "bg-cherry-500 text-cream border-cherry-500" : ""
                }`}
              >
                {TERRAIN_LABELS[t]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Verfügbare Pflöcke">
          <div className="grid grid-cols-4 gap-2">
            <PegToggle color="blue"   label="Blau"  on={state.peg_blue}   onChange={(v) => update("peg_blue", v)}   />
            <PegToggle color="red"    label="Rot"   on={state.peg_red}    onChange={(v) => update("peg_red", v)}    />
            <PegToggle color="yellow" label="Gelb"  on={state.peg_yellow} onChange={(v) => update("peg_yellow", v)} />
            <PegToggle color="white"  label="Weiß"  on={state.peg_white}  onChange={(v) => update("peg_white", v)}  />
          </div>
        </Field>
      </section>

      <div className="hairline" />

      {/* ─── Tarife & Zeiten ────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Tarife &amp; Zeiten</h2>
        <Field label="Preise" icon={<Coins size={14} strokeWidth={1.75} />}>
          <textarea
            className="input"
            rows={2}
            placeholder="z.B. Mitglied 8€, Gast 15€, Tageskarte 25€"
            value={state.price_info}
            onChange={(e) => update("price_info", e.target.value)}
          />
        </Field>
        <Field label="Öffnungszeiten" icon={<Clock size={14} strokeWidth={1.75} />}>
          <textarea
            className="input"
            rows={2}
            placeholder="z.B. Mo–Fr 14–20, Sa/So 9–18"
            value={state.opening_hours}
            onChange={(e) => update("opening_hours", e.target.value)}
          />
        </Field>
        <Field label="Saison-Hinweis" icon={<Calendar size={14} strokeWidth={1.75} />}>
          <input
            className="input"
            placeholder="z.B. Ganzjährig oder Winterpause Nov–Feb"
            value={state.season_note}
            onChange={(e) => update("season_note", e.target.value)}
          />
        </Field>
      </section>

      <div className="hairline" />

      {/* ─── Kontakt & Anreise ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Kontakt &amp; Anreise</h2>
        <Field label="Website" icon={<Globe size={14} strokeWidth={1.75} />}>
          <input
            type="url"
            className="input"
            placeholder="https://..."
            value={state.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" icon={<Mail size={14} strokeWidth={1.75} />}>
            <input
              type="email"
              className="input"
              placeholder="kontakt@..."
              value={state.contact_email}
              onChange={(e) => update("contact_email", e.target.value)}
            />
          </Field>
          <Field label="Telefon" icon={<Phone size={14} strokeWidth={1.75} />}>
            <input
              type="tel"
              className="input"
              placeholder="+49 ..."
              value={state.contact_phone}
              onChange={(e) => update("contact_phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Anreise & Parken" icon={<MapIcon size={14} strokeWidth={1.75} />}>
          <textarea
            className="input"
            rows={2}
            placeholder="z.B. Parkplatz 20 Plätze, ÖV: Bus 502 Haltestelle Eichwald"
            value={state.access_note}
            onChange={(e) => update("access_note", e.target.value)}
          />
        </Field>
      </section>

      <div className="hairline" />

      {/* ─── Wartung & Sichtbarkeit ─────────────────────── */}
      <section className="space-y-3">
        <h2 className="eyebrow">Wartung &amp; Sichtbarkeit</h2>
        <Field label="Letzte Bahn-Erneuerung" icon={<Ruler size={14} strokeWidth={1.75} />}>
          <input
            type="date"
            className="input"
            value={state.last_refresh_date}
            onChange={(e) => update("last_refresh_date", e.target.value)}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={state.is_public}
            onChange={(e) => update("is_public", e.target.checked)}
            className="w-5 h-5 accent-cherry-500 mt-0.5"
          />
          <span className="text-secondary">Öffentlich sichtbar — andere User können den Parcours sehen und für ihre Trainings nutzen.</span>
        </label>
      </section>

      {extraFields && (
        <>
          <div className="hairline" />
          {extraFields}
        </>
      )}

      {error && (
        <div className="rounded-xl bg-cherry-50 dark:bg-cherry-900/30 border border-cherry-200 dark:border-cherry-800 text-cherry-700 dark:text-cherry-200 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {!hideSubmitButton && (
        <button type="submit" className="btn-accent w-full tap-large" disabled={busy || !state.name.trim()}>
          {busy ? "Speichere…" : submitLabel}
        </button>
      )}
    </form>
  );
}

// ─── Subkomponenten ─────────────────────────────────────────────────────

function Field({ label, children, icon, required }: { label: string; children: React.ReactNode; icon?: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-secondary mb-1 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-cherry-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n} Sterne`}
          className="p-1 transition active:scale-90"
        >
          <Star
            size={22}
            strokeWidth={1.5}
            className={value !== null && n <= value ? "fill-gold text-gold" : "text-muted"}
          />
        </button>
      ))}
      {value !== null && (
        <button type="button" onClick={() => onChange(null)} className="ml-2 text-xs text-muted hover:text-primary inline-flex items-center gap-1">
          <X size={12} /> löschen
        </button>
      )}
    </div>
  );
}

function PegToggle({ color, label, on, onChange }: { color: "blue" | "red" | "yellow" | "white"; label: string; on: boolean; onChange: (v: boolean) => void }) {
  const colorClass: Record<typeof color, string> = {
    blue:   "bg-blue-500",
    red:    "bg-red-500",
    yellow: "bg-yellow-400",
    white:  "bg-white border border-warm-graphite/20",
  };
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 transition ${
        on ? "bg-surface border border-cherry-500" : "bg-surface border border-hairline opacity-60"
      }`}
      aria-pressed={on}
    >
      <span className={`w-5 h-5 rounded-full ${colorClass[color]}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ClickToSetMarker({ onPick }: { onPick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [lat, lng, map]);
  return null;
}
