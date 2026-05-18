import { useRef, useState, type ReactNode, type PointerEvent } from "react";

type Action = {
  /** Anzeige-Label im Slide-Bereich */
  label: string;
  /** Background-Color */
  color: string;
  /** Icon-Element */
  icon: ReactNode;
  /** Callback wenn der User die Aktion bestätigt (loslassen über Threshold) */
  onAction: () => void;
};

type Props = {
  children: ReactNode;
  /** Aktion bei Swipe nach LINKS (Card geht nach links → Action erscheint rechts) */
  leftAction?: Action;
  /** Aktion bei Swipe nach RECHTS (Card geht nach rechts → Action erscheint links) */
  rightAction?: Action;
  /** Threshold in px ab dem die Action auslöst (default 80) */
  threshold?: number;
};

/**
 * iOS-style swipeable Card. Während des Swipes wird die hintere Action-Zone
 * sichtbar (mit Icon + Label). Loslassen über `threshold` triggert die Action,
 * unterhalb snappt die Karte zurück auf 0.
 *
 * Touch + Maus über PointerEvents — kein extra Hook nötig.
 */
export default function SwipeableCard({ children, leftAction, rightAction, threshold = 80 }: Props) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startOffset.current = offset;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    let next = startOffset.current + dx;
    // Constrain je nach verfügbarer Action
    if (next < 0 && !leftAction) next = 0;
    if (next > 0 && !rightAction) next = 0;
    // Etwas "elastisch": über 1.5×threshold dämpfen
    const max = threshold * 2;
    if (next > max) next = max + (next - max) * 0.2;
    if (next < -max) next = -max + (next + max) * 0.2;
    setOffset(next);
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    if (offset <= -threshold && leftAction) {
      // Swipe nach links bestätigt
      setOffset(0);
      leftAction.onAction();
    } else if (offset >= threshold && rightAction) {
      // Swipe nach rechts bestätigt
      setOffset(0);
      rightAction.onAction();
    } else {
      setOffset(0);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background Action — links (zeigt sich beim Swipe nach RECHTS) */}
      {rightAction && offset > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start px-5 text-cream font-medium"
          style={{ background: rightAction.color, width: Math.max(offset, threshold) }}
        >
          <div className="flex items-center gap-2">{rightAction.icon} <span>{rightAction.label}</span></div>
        </div>
      )}
      {/* Background Action — rechts (zeigt sich beim Swipe nach LINKS) */}
      {leftAction && offset < 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-5 text-cream font-medium"
          style={{ background: leftAction.color, width: Math.max(-offset, threshold) }}
        >
          <div className="flex items-center gap-2"><span>{leftAction.label}</span> {leftAction.icon}</div>
        </div>
      )}
      {/* Foreground = das eigentliche Card-Content */}
      <div
        className="relative bg-elevated transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: startX.current === null ? "200ms" : "0ms",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { startX.current = null; setOffset(0); }}
      >
        {children}
      </div>
    </div>
  );
}
