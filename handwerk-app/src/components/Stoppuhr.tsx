"use client";

import { useEffect, useRef, useState } from "react";

// Stoppuhr për zeitërfassung: Start/Stopp mbush fushën «Dauer» (h:mm) të formularit
export default function Stoppuhr({ zielName }: { zielName: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [sekunden, setSekunden] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!laeuft) return;
    const t = setInterval(() => setSekunden(Math.floor((Date.now() - (start.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [laeuft]);

  const stoppe = () => {
    setLaeuft(false);
    const minuten = Math.max(1, Math.round(sekunden / 60));
    const feld = document.querySelector<HTMLInputElement>(`input[name="${zielName}"]`);
    if (feld) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(feld, `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")}`);
      feld.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const mm = String(Math.floor(sekunden / 60)).padStart(2, "0");
  const ss = String(sekunden % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono tabular-nums">{mm}:{ss}</span>
      {laeuft ? (
        <button type="button" onClick={stoppe} className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
          ■ Stopp
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            start.current = Date.now();
            setSekunden(0);
            setLaeuft(true);
          }}
          className="rounded border border-forest px-3 py-1.5 text-xs font-semibold text-forest hover:bg-surface2"
        >
          ▶ Stoppuhr
        </button>
      )}
    </div>
  );
}
