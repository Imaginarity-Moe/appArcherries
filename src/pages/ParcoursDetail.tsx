import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Map as MapIcon, Play, Trash2, Globe, Pencil,
  Clock, Coins, Phone, Mail, Calendar, Ruler, Star, List as ListIcon,
} from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
import { PageSpinner } from "../components/Spinner";
import {
  deleteParcours,
  getParcours,
  TERRAIN_LABELS,
  type Parcours,
  type TerrainKey,
} from "../api/parcours";
import { useConfirm } from "../components/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import ParcoursReviews from "../components/ParcoursReviews";
import HighscoreCard from "../components/HighscoreCard";
import FavoriteButton from "../components/FavoriteButton";
import { usePageFooter } from "../components/FooterContext";
import Avatar from "../components/Avatar";

const customIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 0 C 7 0 0 7 0 16 C 0 26 16 40 16 40 C 16 40 32 26 32 16 C 32 7 25 0 16 0 Z" fill="#8E2C3A"/><circle cx="16" cy="16" r="6" fill="#FAF8F4"/></svg>'
    ),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

export default function ParcoursDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation(["parcours", "common"]);
  const { user } = useAuth();
  const [p, setP] = useState<Parcours | null>(null);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const isOwner = !!(p && user && p.user_id === user.id);

  const reload = () => {
    getParcours(Number(id))
      .then((r) => setP(r.parcours))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!p) return;
    const ok = await confirm({
      title: "Parcours löschen?",
      message: `„${p.name}" und das hochgeladene Bild werden entfernt. Bisherige Trainings bleiben unangetastet.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    await deleteParcours(p.id);
    nav("/parcours");
  }

  // Page-spezifischer Footer: Zurück, Hier trainieren, Bearbeiten (Owner), Bahnen
  const footerActions = useMemo(() => {
    if (!p) return null;
    const actions: Array<
      | { kind: "link"; to: string; icon: React.ReactNode; label: string; primary?: boolean }
      | { kind: "button"; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }
    > = [
      { kind: "link", to: "/parcours", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link", to: `/trainings/new?parcours=${p.id}`, icon: <Play size={20} strokeWidth={2} />, label: "Trainieren", primary: true },
      { kind: "link", to: `/parcours/${p.id}/lanes`, icon: <ListIcon size={20} strokeWidth={1.75} />, label: "Bahnen" },
    ];
    if (isOwner) {
      actions.push({
        kind: "link",
        to: `/parcours/${p.id}/edit`,
        icon: <Pencil size={20} strokeWidth={1.75} />,
        label: "Bearbeiten",
      });
    }
    return actions;
  }, [p, isOwner]);
  usePageFooter(footerActions);

  if (loading) return <PageSpinner />;
  if (!p) return <p className="text-cherry-500 p-8">Not found</p>;

  const terrainKeys = (p.terrain ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is TerrainKey => s in TERRAIN_LABELS);

  const pegs = [
    { on: p.peg_blue,   color: "bg-blue-500",  label: "Blau" },
    { on: p.peg_red,    color: "bg-red-500",   label: "Rot" },
    { on: p.peg_yellow, color: "bg-yellow-400",label: "Gelb" },
    { on: p.peg_white,  color: "bg-white border border-warm-graphite/20", label: "Weiß" },
  ].filter((p) => p.on);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <Link to="/parcours" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ArrowLeft size={16} strokeWidth={1.75} /> {t("common:actions.back")}
      </Link>

      {p.image_url && (
        <img src={p.image_url} alt={p.name} className="w-full rounded-2xl object-cover max-h-80" />
      )}

      {/* ─── Hauptkarte: Name + Adresse + Beschreibung + Karte + Aktionen ─── */}
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="display text-h2">{p.name}</h1>
            {p.address && <div className="text-sm text-secondary mt-1">📍 {p.address}</div>}
            <div className="flex items-center gap-3 mt-2">
              {p.difficulty !== null && (
                <div className="flex items-center gap-0.5" aria-label={`Schwierigkeit ${p.difficulty} von 5`} title="Schwierigkeit">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={14}
                      strokeWidth={1.5}
                      className={n <= (p.difficulty ?? 0) ? "fill-gold text-gold" : "text-muted"}
                    />
                  ))}
                </div>
              )}
              {p.review_count > 0 && p.avg_rating !== null && (
                <div className="flex items-center gap-1 text-xs text-secondary" title="Community-Bewertung">
                  <Star size={12} strokeWidth={1.5} className="fill-cherry-500 text-cherry-500" />
                  <span className="font-semibold tabular-nums">{p.avg_rating.toFixed(1)}</span>
                  <span className="text-muted">({p.review_count})</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <FavoriteButton kind="parcours" refValue={String(p.id)} size="lg" />
            {p.is_public && (
              <span className="chip-accent">
                <Globe size={12} strokeWidth={1.75} /> Öffentlich
              </span>
            )}
          </div>
        </div>

        {/* Ersteller-Info — nur sichtbar bei fremden Parcours */}
        {!isOwner && p.user_display_name && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline">
            <Avatar
              user={{ display_name: p.user_display_name, avatar_url: p.user_avatar_url }}
              size="sm"
            />
            <div className="text-sm">
              <span className="text-muted">Angelegt von </span>
              <span className="font-medium text-secondary">{p.user_display_name}</span>
            </div>
          </div>
        )}

        {p.description && (
          <p className="text-primary mt-3 whitespace-pre-wrap text-sm">{p.description}</p>
        )}

        {p.lat != null && p.lng != null && (
          <div className="rounded-xl overflow-hidden mt-4 border border-hairline isolate" style={{ height: 240 }}>
            <MapContainer center={[p.lat, p.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[p.lat, p.lng]} icon={customIcon} />
            </MapContainer>
          </div>
        )}

        {/* Sekundäre Aktionen — Haupt-Aktionen (Trainieren/Bearbeiten/Bahnen) sind in der Footer-Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
          {p.lat != null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=15/${p.lat}/${p.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs"
            >
              <MapIcon size={14} strokeWidth={1.75} /> {t("parcours:detail.open_map")}
            </a>
          )}
          {isOwner && (
            <button onClick={handleDelete} className="btn-ghost danger text-xs ml-auto">
              <Trash2 size={14} strokeWidth={1.75} /> {t("parcours:detail.delete")}
            </button>
          )}
        </div>
      </div>

      {/* ─── Details-Grid (nur rendern wenn was gepflegt ist) ──────────── */}
      {hasAnyDetail(p, terrainKeys.length, pegs.length) && (
        <div className="card space-y-3">
          <h2 className="eyebrow">Parcours-Details</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {p.lanes_count !== null && (
              <DetailItem
                icon={<MapIcon size={14} strokeWidth={1.75} />}
                label="Bahnen"
                value={
                  p.lanes_detailed_count > 0
                    ? `${p.lanes_detailed_count} / ${p.lanes_count} detailliert`
                    : `${p.lanes_count}`
                }
              />
            )}
            {p.duration_min !== null && (
              <DetailItem icon={<Clock size={14} strokeWidth={1.75} />} label="Dauer" value={formatDuration(p.duration_min)} />
            )}
            {p.last_refresh_date && (
              <DetailItem icon={<Ruler size={14} strokeWidth={1.75} />} label="Letzte Erneuerung" value={formatDate(p.last_refresh_date)} />
            )}
          </div>

          {terrainKeys.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">Geländetyp</div>
              <div className="flex flex-wrap gap-1.5">
                {terrainKeys.map((k) => (
                  <span key={k} className="chip">{TERRAIN_LABELS[k]}</span>
                ))}
              </div>
            </div>
          )}

          {pegs.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">Verfügbare Pflöcke</div>
              <div className="flex flex-wrap gap-2">
                {pegs.map((p) => (
                  <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-hairline px-2.5 py-1 text-xs">
                    <span className={`w-3 h-3 rounded-full ${p.color}`} />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tarife & Zeiten ───────────────────────────────────────────── */}
      {(p.price_info || p.opening_hours || p.season_note) && (
        <div className="card space-y-3">
          <h2 className="eyebrow">Tarife &amp; Zeiten</h2>
          {p.price_info && (
            <BlockField icon={<Coins size={14} strokeWidth={1.75} />} label="Preise" value={p.price_info} />
          )}
          {p.opening_hours && (
            <BlockField icon={<Clock size={14} strokeWidth={1.75} />} label="Öffnungszeiten" value={p.opening_hours} />
          )}
          {p.season_note && (
            <BlockField icon={<Calendar size={14} strokeWidth={1.75} />} label="Saison" value={p.season_note} />
          )}
        </div>
      )}

      {/* ─── Highscore (top 3 pro Disziplin × Bow) ─────────────────────── */}
      <HighscoreCard parcoursId={p.id} />

      {/* ─── Bewertungen & Kommentare ──────────────────────────────────── */}
      <ParcoursReviews parcoursId={p.id} onAggregateChange={reload} />

      {/* ─── Kontakt & Anreise ─────────────────────────────────────────── */}
      {(p.website || p.contact_email || p.contact_phone || p.access_note) && (
        <div className="card space-y-3">
          <h2 className="eyebrow">Kontakt &amp; Anreise</h2>
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cherry-500 hover:underline break-all">
              <Globe size={14} strokeWidth={1.75} /> {p.website}
            </a>
          )}
          {p.contact_email && (
            <a href={`mailto:${p.contact_email}`} className="flex items-center gap-2 text-sm text-cherry-500 hover:underline">
              <Mail size={14} strokeWidth={1.75} /> {p.contact_email}
            </a>
          )}
          {p.contact_phone && (
            <a href={`tel:${p.contact_phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 text-sm text-cherry-500 hover:underline">
              <Phone size={14} strokeWidth={1.75} /> {p.contact_phone}
            </a>
          )}
          {p.access_note && (
            <BlockField icon={<MapIcon size={14} strokeWidth={1.75} />} label="Anreise & Parken" value={p.access_note} />
          )}
        </div>
      )}
    </div>
  );
}

function hasAnyDetail(p: Parcours, terrainCount: number, pegCount: number): boolean {
  return (
    p.lanes_count !== null ||
    p.duration_min !== null ||
    p.last_refresh_date !== null ||
    terrainCount > 0 ||
    pegCount > 0
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted">{icon}</span>
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className="font-medium text-primary">{value}</div>
      </div>
    </div>
  );
}

function BlockField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="text-sm text-primary whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h}h ${m}min`;
}

function formatDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}
