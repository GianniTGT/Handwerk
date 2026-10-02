export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import {
  createWartungsvertrag,
  deleteWartungsvertrag,
  setWartungsvertragStatus,
  wartungAuftragErstellen,
} from "@/lib/actions";

const statusFarben: Record<string, string> = {
  AKTIV: "bg-green-100 text-green-800",
  PAUSIERT: "bg-amber-100 text-amber-800",
  GEKUENDIGT: "bg-surface2 text-muted",
};

function faelligkeit(datum: Date): { label: string; klasse: string } {
  const tage = Math.ceil((datum.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (tage < 0) return { label: `überfällig seit ${-tage} Tagen`, klasse: "bg-red-100 text-red-700" };
  if (tage <= 30) return { label: `fällig in ${tage} Tagen`, klasse: "bg-amber-100 text-amber-800" };
  return { label: datum.toLocaleDateString("de-CH"), klasse: "bg-surface2 text-muted" };
}

export default async function WartungPage() {
  const { betrieb } = await sitzungErforderlich();
  const [vertraege, kunden] = await Promise.all([
    db.wartungsvertrag.findMany({
      where: { betriebId: betrieb.id },
      include: { kunde: true, objekt: true },
      orderBy: { naechsteWartung: "asc" },
    }),
    db.kunde.findMany({
      where: { betriebId: betrieb.id },
      include: { objekte: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const aktive = vertraege.filter((v) => v.status !== "GEKUENDIGT");
  const gekuendigte = vertraege.filter((v) => v.status === "GEKUENDIGT");

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-xl font-bold">Wartungsverträge</h1>
        <p className="mt-1 text-sm text-muted">
          Pro Anlage ein Vertrag — das System erinnert Sie, wann der Service fällig ist.
          Ein Klick erstellt den Auftrag und verschiebt den nächsten Termin automatisch.
        </p>

        <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
          {aktive.map((v) => {
            const f = faelligkeit(v.naechsteWartung);
            return (
              <li key={v.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      WV-{v.nummer} — {v.titel}
                    </div>
                    <div className="text-sm text-muted">
                      <Link href={`/kunden/${v.kundeId}`} className="underline">
                        {v.kunde.name}
                      </Link>{" "}
                      · {v.objekt.bezeichnung} · alle {v.intervallMonate} Monate
                      {v.preis > 0 && ` · CHF ${chf(v.preis)}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.klasse}`}>
                      ⏰ {f.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[v.status]}`}>
                      {v.status}
                    </span>
                    {v.status === "AKTIV" && (
                      <form action={wartungAuftragErstellen}>
                        <input type="hidden" name="vertragId" value={v.id} />
                        <button className="rounded bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-soft">
                          ⚡ Auftrag erstellen
                        </button>
                      </form>
                    )}
                    <form action={setWartungsvertragStatus}>
                      <input type="hidden" name="vertragId" value={v.id} />
                      <input type="hidden" name="status" value={v.status === "AKTIV" ? "PAUSIERT" : "AKTIV"} />
                      <button className="rounded border border-line px-2 py-1.5 text-xs hover:bg-surface2">
                        {v.status === "AKTIV" ? "Pausieren" : "Aktivieren"}
                      </button>
                    </form>
                    <form action={setWartungsvertragStatus}>
                      <input type="hidden" name="vertragId" value={v.id} />
                      <input type="hidden" name="status" value="GEKUENDIGT" />
                      <button className="rounded border border-red-300 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
                        Kündigen
                      </button>
                    </form>
                  </div>
                </div>
                {v.bemerkung && <p className="mt-1 text-xs text-muted">{v.bemerkung}</p>}
              </li>
            );
          })}
          {aktive.length === 0 && (
            <li className="p-3 text-sm text-muted">
              Noch keine Wartungsverträge — rechts den ersten erfassen.
            </li>
          )}
        </ul>

        {gekuendigte.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">
              Gekündigte Verträge ({gekuendigte.length})
            </summary>
            <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
              {gekuendigte.map((v) => (
                <li key={v.id} className="flex items-center justify-between p-3 text-sm text-muted">
                  <span>
                    WV-{v.nummer} — {v.titel} · {v.kunde.name} · {v.objekt.bezeichnung}
                  </span>
                  <span className="flex gap-2">
                    <form action={setWartungsvertragStatus}>
                      <input type="hidden" name="vertragId" value={v.id} />
                      <input type="hidden" name="status" value="AKTIV" />
                      <button className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                        Reaktivieren
                      </button>
                    </form>
                    <form action={deleteWartungsvertrag}>
                      <input type="hidden" name="vertragId" value={v.id} />
                      <button className="text-muted hover:text-red-600">✕</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <form
        action={createWartungsvertrag}
        className="h-fit rounded-tiff border border-line bg-white p-4 shadow-sm"
      >
        <h2 className="font-semibold">Neuer Wartungsvertrag</h2>
        <div className="mt-3 grid gap-2">
          <select name="objektId" required className="rounded border border-line p-2 text-sm">
            <option value="">Anlage/Objekt wählen *</option>
            {kunden.flatMap((k) =>
              k.objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {k.name} — {o.bezeichnung}
                </option>
              ))
            )}
          </select>
          <input
            name="titel"
            placeholder="Titel (Standard: Jahreswartung Heizung)"
            className="rounded border border-line p-2 text-sm"
          />
          <label className="grid gap-1 text-xs text-muted">
            Intervall
            <select name="intervallMonate" className="rounded border border-line p-2 text-sm text-ink">
              <option value="12">jährlich (12 Monate)</option>
              <option value="6">halbjährlich (6 Monate)</option>
              <option value="3">vierteljährlich (3 Monate)</option>
              <option value="24">alle 2 Jahre</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Nächste Wartung
            <input
              name="naechsteWartung"
              type="date"
              required
              className="rounded border border-line p-2 text-sm text-ink"
            />
          </label>
          <input
            name="preis"
            type="number"
            step="0.05"
            placeholder="Vereinbarter Preis CHF (optional)"
            className="rounded border border-line p-2 text-sm"
          />
          <input
            name="bemerkung"
            placeholder="Bemerkung (z.B. Schlüssel beim Hauswart)"
            className="rounded border border-line p-2 text-sm"
          />
          <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
            Vertrag erfassen
          </button>
        </div>
      </form>
    </div>
  );
}
