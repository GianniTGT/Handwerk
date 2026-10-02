"use client";

import { useRef, useState } from "react";

export default function SignaturePad({
  auftragId,
  vorhandeneUnterschrift,
  onSave,
}: {
  auftragId: string;
  vorhandeneUnterschrift: string;
  onSave: (auftragId: string, dataUrl: string) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zeichnet = useRef(false);
  const [leer, setLeer] = useState(true);
  const [speichert, setSpeichert] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    zeichnet.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function ziehen(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setLeer(false);
  }

  function ende() {
    zeichnet.current = false;
  }

  function loeschen() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setLeer(true);
  }

  async function speichern() {
    if (leer) return;
    setSpeichert(true);
    await onSave(auftragId, canvasRef.current!.toDataURL("image/png"));
    setSpeichert(false);
  }

  if (vorhandeneUnterschrift) {
    return (
      <div>
        <div className="text-sm font-semibold">Kundenunterschrift ✅</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vorhandeneUnterschrift}
          alt="Unterschrift"
          className="mt-2 h-24 rounded border border-slate-200 bg-white"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold">Kundenunterschrift</div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="mt-2 w-full touch-none rounded border border-slate-300 bg-white"
        onPointerDown={start}
        onPointerMove={ziehen}
        onPointerUp={ende}
        onPointerLeave={ende}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={speichern}
          disabled={leer || speichert}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {speichert ? "Speichert…" : "Unterschrift speichern & Auftrag abschliessen"}
        </button>
        <button onClick={loeschen} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
          Löschen
        </button>
      </div>
    </div>
  );
}
