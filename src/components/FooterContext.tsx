import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type FooterAction =
  | { kind: "link";   to: string;       icon: ReactNode; label: string; primary?: boolean; danger?: boolean }
  | { kind: "button"; onClick: () => void; icon: ReactNode; label: string; primary?: boolean; danger?: boolean; disabled?: boolean };

type Ctx = {
  actions: FooterAction[] | null;
  setActions: (a: FooterAction[] | null) => void;
};

const FooterCtx = createContext<Ctx | null>(null);

export function FooterProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<FooterAction[] | null>(null);
  return <FooterCtx.Provider value={{ actions, setActions }}>{children}</FooterCtx.Provider>;
}

export function useFooter() {
  const c = useContext(FooterCtx);
  if (!c) throw new Error("useFooter must be inside <FooterProvider>");
  return c;
}

/**
 * Hook für Pages: setzt eigene Footer-Actions, räumt beim Unmount auf.
 * Caller muss sicherstellen, dass das `actions`-Array stabil ist (z.B. via useMemo)
 * oder JSON-stringify-Vergleich tolerieren.
 */
export function usePageFooter(actions: FooterAction[] | null | undefined): void {
  const { setActions } = useFooter();
  const key = actions ? hashActions(actions) : null;
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      setActions(actions ?? null);
    }
    return () => {
      // bei Unmount aufräumen
      setActions(null);
      lastKeyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function hashActions(actions: FooterAction[]): string {
  return actions
    .map((a) => (a.kind === "link" ? `L:${a.to}:${a.label}` : `B:${a.label}:${a.disabled ? "off" : "on"}`))
    .join("|");
}
