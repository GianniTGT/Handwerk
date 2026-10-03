"use client";

import { useState } from "react";

// Kunde wählen → passende Objekte/Anlagen dieses Kunden zur Auswahl (Offerte/Auftrag neu)
type Kunde = { id: string; name: string; objekte: { id: string; bezeichnung: string }[] };

export default function KundeObjektWahl({
  kunden,
  startKundeId = "",
}: {
  kunden: Kunde[];
  startKundeId?: string;
}) {
  const [kundeId, setKundeId] = useState(startKundeId);
  const objekte = kunden.find((k) => k.id === kundeId)?.objekte ?? [];
  const feld = "w-full rounded border border-line bg-white p-2 text-sm";

  return (
    <>
      <label className="grid gap-0.5 text-xs text-muted">
        Kontakt *
        <select name="kundeId" required value={kundeId} onChange={(e) => setKundeId(e.target.value)} className={feld}>
          <option value="">Kontakt wählen …</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-0.5 text-xs text-muted">
        Objekt / Anlage
        <select name="objektId" className={feld} disabled={!kundeId} defaultValue="">
          <option value="">{kundeId ? (objekte.length ? "— kein Objekt —" : "Kontakt hat noch keine Objekte") : "Zuerst Kontakt wählen"}</option>
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.bezeichnung}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
