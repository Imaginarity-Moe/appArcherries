import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, X, Check, Share2 } from "lucide-react";
import { createInvitation, type Invitation } from "../api/invitations";

type Props = {
  trainingId: number;
  onClose: () => void;
};

export default function InviteModal({ trainingId, onClose }: Props) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await createInvitation(trainingId, { role: "scorer", expires_in_hours: 24 });
        if (!cancelled) setInvitation(r.invitation);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [trainingId]);

  const copyLink = async () => {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: prompt
      window.prompt("Link zum Kopieren:", invitation.url);
    }
  };

  const share = async () => {
    if (!invitation) return;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: "Archerries-Training", text: "Mach mit bei meiner Runde!", url: invitation.url });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
      <div className="w-full sm:max-w-md bg-elevated dark:bg-elevated-dark rounded-t-3xl sm:rounded-3xl p-6 shadow-lift animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold text-forest-900 dark:text-forest-50">
            Andere einladen
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        {loading && <p className="text-forest-700 dark:text-forest-300 py-8 text-center">Erstelle Einladung…</p>}

        {error && <p className="text-red-700 py-4">{error}</p>}

        {invitation && (
          <>
            <p className="text-sm text-forest-700 dark:text-forest-300 mb-4">
              Teile diesen Link oder QR-Code. Wer ihn öffnet, kann mit-scoren — auch ohne Account.
              Link läuft in 24 Stunden ab.
            </p>

            <div className="flex justify-center my-4">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={invitation.url} size={200} level="M" />
              </div>
            </div>

            <div className="bg-sunken dark:bg-sunken-dark rounded-xl px-3 py-2 mt-4 flex items-center gap-2">
              <code className="text-xs text-forest-700 dark:text-forest-200 truncate flex-1 font-mono">
                {invitation.url}
              </code>
              <button onClick={copyLink} className="btn-icon" aria-label="Link kopieren">
                {copied ? <Check size={16} className="text-forest-500" /> : <Copy size={16} />}
              </button>
            </div>

            <button onClick={share} className="btn w-full mt-4 inline-flex items-center justify-center gap-2">
              <Share2 size={16} /> Teilen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
