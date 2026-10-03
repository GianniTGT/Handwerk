"use client";

import { useState } from "react";
import { Ik } from "@/components/Icons";

// Kartë eksporti: opsionalisht me periudhë Von/Bis; shkarkimi shkon te /api/export/<typ>
export default function ExportKarte({ typ, label, mitZeitraum }: { typ: string; label: string; mitZeitraum: boolean }) {
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const q = new URLSearchParams();
  if (von) q.set("von", von);
  if (bis) q.set("bis", bis);
  const href = `/api/export/${typ}${q.toString() ? `?${q}` : ""}`;
  const feld = "rounded border border-line p-1.5 text-sm";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-tiff border border-line bg-white p-3 shadow-sm">
      <div className="font-medium">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        {mitZeitraum && (
          <>
            <input type="date" value={von} onChange={(e) => setVon(e.target.value)} className={feld} aria-label="Von" />
            <span className="text-xs text-muted">bis</span>
            <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} className={feld} aria-label="Bis" />
          </>
        )}
        <a href={href} className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-lift"><Ik name="download" />CSV</a>
      </div>
    </div>
  );
}
