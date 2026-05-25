import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Minimal Toast-System mit Context-Provider.
 *
 * Nutzung:
 *   const { showToast } = useToast();
 *   showToast({ icon: "🏆", title: "Neuer Erfolg!", body: "Erste Schritte freigeschaltet" });
 *
 * Toasts stacken sich rechts unten (Desktop) bzw. oben (Mobile, da Bottom-Nav).
 * Auto-Dismiss nach 6s, Klick auf X = sofort weg.
 */

export type ToastInput = {
  icon?: string;          // Emoji oder Lucide-Icon-Komponente als ReactNode
  title: string;
  body?: string;
  href?: string;          // optional: Toast wird klickbar (z.B. Link auf /profile)
  duration?: number;      // ms, default 6000
  variant?: "default" | "success" | "cherry";
};

type ToastInternal = ToastInput & { id: number };

type ToastContextValue = {
  showToast: (t: ToastInput) => void;
};

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((t: ToastInput) => {
    const id = ++idRef.current;
    const duration = t.duration ?? 6000;
    setToasts((prev) => [...prev, { ...t, id }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastInternal[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <>
      {/* Mobile: oben unter dem Header. Desktop: rechts unten. */}
      <div
        className="fixed z-[60] pointer-events-none flex flex-col gap-2 px-4
                   top-[calc(env(safe-area-inset-top)+3.5rem)] right-0 left-0 items-center
                   lg:top-auto lg:bottom-6 lg:right-6 lg:left-auto lg:items-end lg:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </div>
    </>
  );
}

function ToastCard({ t, onDismiss }: { t: ToastInternal; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { setEntered(true); }, []);

  const variantCls =
    t.variant === "success" ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/30" :
    t.variant === "cherry"  ? "border-cherry-500/40 bg-cherry-50 dark:bg-cherry-900/30"   :
    "border-hairline bg-elevated";

  const content = (
    <div className={`pointer-events-auto card flex items-start gap-3 w-full max-w-sm shadow-lift ${variantCls} transition ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      {t.icon && (
        <span className="text-2xl shrink-0 leading-none mt-0.5">{t.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t.title}</p>
        {t.body && <p className="text-xs text-secondary mt-0.5">{t.body}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="btn-icon shrink-0 -mt-1 -mr-1"
        aria-label="Schließen"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );

  if (t.href) {
    return (
      <a href={t.href} onClick={onDismiss} className="block">
        {content}
      </a>
    );
  }
  return content;
}
