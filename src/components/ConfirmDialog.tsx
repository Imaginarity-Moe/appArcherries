import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

type ConfirmCtx = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmCtx | null>(null);

/**
 * Globale Confirm-Dialog-Provider. Pages rufen `const confirm = useConfirm();`
 * und nutzen `await confirm({ title, ... })` für sensible Aktionen.
 *
 * Ersetzt window.confirm() durch ein themable Bottom-Sheet/Modal-Dialog.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmCtx>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => close(false)}
            aria-label="Schließen"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-sm bg-elevated rounded-3xl shadow-lift border border-hairline p-5 animate-slide-up"
          >
            <div className="flex items-start gap-3">
              {state.opts.variant === "danger" && (
                <span className="shrink-0 w-9 h-9 rounded-full bg-cherry-500/15 text-cherry-500 flex items-center justify-center">
                  <AlertTriangle size={18} strokeWidth={1.75} />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-semibold text-primary tracking-tight">
                  {state.opts.title}
                </h2>
                {state.opts.message && (
                  <p className="text-sm text-secondary mt-1">{state.opts.message}</p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="btn-icon -mt-1 -mr-1 shrink-0"
                aria-label="Abbrechen"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => close(false)} className="btn-secondary flex-1">
                {state.opts.cancelLabel ?? "Abbrechen"}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 ${state.opts.variant === "danger" ? "btn-danger" : "btn"}`}
                autoFocus
              >
                {state.opts.confirmLabel ?? "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
