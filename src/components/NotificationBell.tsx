import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, UserPlus, UserCheck, UserX, Target } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";

/**
 * Glocke im Header mit Anzahl-Badge.
 * Click öffnet Popover, polled alle 30s wenn Tab sichtbar.
 * align: 'right' (Mobile-Header, Bell rechts → Popover öffnet links) /
 *        'left'  (Desktop-Sidebar, Bell links → Popover öffnet rechts).
 */
export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Poll wenn Tab sichtbar; pause wenn versteckt
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const fetchNow = async () => {
      try {
        const r = await listNotifications();
        if (!alive) return;
        setItems(r.items);
        setUnread(r.unread_count);
      } catch {/* ignore */}
    };
    fetchNow();
    // 90s-Polling (war 30s): IONOS-Shared-PHP-Worker schonen — Notifications sind
    // nicht zeitkritisch. Bei Tab-Aktivierung wird sofort einmalig nachgepollt.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNow();
    }, 90000);
    const onVis = () => { if (document.visibilityState === "visible") fetchNow(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [user]);

  // Outside-Click schließt Popover
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  async function clickItem(n: Notification) {
    if (!n.read) {
      try {
        const r = await markNotificationRead(n.id);
        setItems(r.items);
        setUnread(r.unread_count);
      } catch {/* ignore */}
    }
    setOpen(false);
    const route = routeForNotification(n);
    if (route) nav(route);
  }

  async function markAll() {
    try {
      const r = await markAllNotificationsRead();
      setItems(r.items);
      setUnread(r.unread_count);
    } catch {/* ignore */}
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="btn-icon relative"
        aria-label={`Benachrichtigungen${unread > 0 ? ` (${unread} ungelesen)` : ""}`}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-cherry-500 text-cream text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-[320px] max-w-[calc(100vw-1.5rem)] max-h-[70vh] z-50 rounded-2xl bg-elevated border border-hairline shadow-xl overflow-hidden flex flex-col`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <div className="font-semibold text-sm">Benachrichtigungen</div>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] text-cherry-500 hover:underline">
                Alle als gelesen
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Noch keine Benachrichtigungen.
            </div>
          ) : (
            <ul className="overflow-y-auto flex-1 divide-y divide-hairline">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => clickItem(n)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-surface transition ${
                      !n.read ? "bg-cherry-50 dark:bg-cherry-900/20" : ""
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      !n.read ? "bg-cherry-500 text-cream" : "bg-surface text-muted"
                    }`}>
                      {iconFor(n.kind)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">{titleFor(n)}</div>
                      <div className="text-[11px] text-muted mt-0.5">{relTime(n.created_at)}</div>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 mt-2 rounded-full bg-cherry-500 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function iconFor(kind: string) {
  const size = 14;
  switch (kind) {
    case "friend_request_received": return <UserPlus size={size} strokeWidth={1.75} />;
    case "friend_request_accepted": return <UserCheck size={size} strokeWidth={1.75} />;
    case "friend_request_rejected": return <UserX size={size} strokeWidth={1.75} />;
    case "training_friend_added":   return <Target size={size} strokeWidth={1.75} />;
    default:                        return <Check size={size} strokeWidth={1.75} />;
  }
}

function titleFor(n: Notification): string {
  const p = n.payload ?? {};
  const name = (k: string) => (p[k] as string) || "Jemand";
  switch (n.kind) {
    case "friend_request_received":  return `${name("from_display_name")} möchte dein Freund werden`;
    case "friend_request_accepted":  return `${name("by_display_name")} hat deine Anfrage angenommen`;
    case "friend_request_rejected":  return `${name("by_display_name")} hat deine Anfrage abgelehnt`;
    case "training_friend_added":    return `${name("by_display_name")} hat dich zu einem Training hinzugefügt`;
    default:                         return n.kind;
  }
}

function routeForNotification(n: Notification): string | null {
  const p = n.payload ?? {};
  switch (n.kind) {
    case "friend_request_received":
    case "friend_request_accepted":
    case "friend_request_rejected":
      return "/friends";
    case "training_friend_added":
      return p.training_id ? `/trainings/${p.training_id}` : null;
    default:
      return null;
  }
}

function relTime(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} h`;
  const day = Math.floor(h / 24);
  if (day < 7) return `vor ${day} Tag${day === 1 ? "" : "en"}`;
  return d.toLocaleDateString("de-DE");
}
