export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteWartungsvertrag, setWartungsvertragStatus, wartungAuftragErstellen } from "@/lib/actions";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const statusFarben: Record<string, string> = {
  AKTIV: "bg-green-100 text-green-800",
  PAUSIERT: "bg-amber-100 text-amber-800",
  GEKUENDIGT: "bg-surface2 text-muted",
};
const statusText: Record<string, string> = { AKTIV: "Aktiv", PAUSIERT: "Pausiert", GEKUENDIGT: "Gekündigt" };
const TABS: [string, string][] = [
  ["laufend", "Laufend"],
  ["faellig", "Fällig (30 Tage)"],
  ["aktiv", "Aktiv"],
  ["pausiert", "Pausiert"],
  ["gekuendigt", "Gekündigt"],
  ["alle", "Alle"],
];

const tageBis = (datum: Date) => Math.ceil((datum.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

export default async function WartungPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; gespeichert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "laufend", q: qRoh = "", gespeichert } = await searchParams;
  const q = qRoh.trim().toLowerCase();
  const alle = await db.wartungsvertrag.findMany({
    where: { betriebId: betrieb.id },
    include: { kunde: true, objekt: true },
    orderBy: { naechsteWartung: "asc" },
  });
  const zeilen = alle.map((v) => ({ v, tage: tageBis(v.naechsteWartung) }));
  const passt = (z: (typeof zeilen)[number], key: string) =>
    key === "alle"
      ? true
      : key === "laufend"
        ? z.v.status !== "GEKUENDIGT"
        : key === "faellig"
          ? z.v.status === "AKTIV" && z.tage <= 30
          : z.v.status === key.toUpperCase();
  const sichtbar = zeilen.filter(
    (z) => passt(z, filter) && (!q || `WV-${z.v.nummer} ${z.v.titel} ${z.v.kunde.name} ${z.v.objekt.bezeichnung}`.toLowerCase().includes(q))
  );
  const summePreis = sichtbar.reduce((s, z) => s + z.v.preis, 0);

  return (
    <div>
      <ListenKopf
        titel="Wartungsverträge"
        untertitel="Pro Anlage ein Vertrag. «Auftrag erstellen» legt den Service-Auftrag an und verschiebt den nächsten Termin um das Intervall."
        neuHref="/wartung/neu"
        neuLabel="Neuer Wartungsvertrag"
        menue={
          <div className="grid gap-1 text-sm">
            <Link href="/wiederkehrend" className="text-forest underline">Wiederkehrende Rechnungen (Pauschalen)</Link>
          </div>
        }
      />
      {gespeichert && <Hinweis>Vertrag erfasst ✓</Hinweis>}
      <ReiterUndSuche
        basis="/wartung"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Nummer, Titel, Kontakt, Anlage …"
        reiter={TABS.map(([key, label]) => ({
          key,
          label,
          anzahl: zeilen.filter((z) => passt(z, key)).length,
          warn: key === "faellig",
        }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="p-2">Vertrag</th>
            <th className="hidden p-2 sm:table-cell">Kontakt / Anlage</th>
            <th className="hidden p-2 md:table-cell">Intervall</th>
            <th className="p-2">Nächste Wartung</th>
            <th className="hidden p-2 text-right lg:table-cell">Preis CHF</th>
            <th className="p-2">Status</th>
            <th className="p-2 text-right">Aktion</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ v, tage }) => (
            <tr key={v.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">WV-{v.nummer}</td>
              <td className="p-2">
                <span className="font-medium">{v.titel}</span>
                {v.bemerkung && <span className="block max-w-xs truncate text-xs text-muted">{v.bemerkung}</span>}
              </td>
              <td className="hidden p-2 sm:table-cell">
                <Link href={`/kunden/${v.kundeId}`} className="hover:underline">{v.kunde.name}</Link>
                <span className="block text-xs text-muted">{v.objekt.bezeichnung}</span>
              </td>
              <td className="hidden p-2 text-muted md:table-cell">alle {v.intervallMonate} Monate</td>
              <td className="whitespace-nowrap p-2">
                {v.status === "AKTIV" && tage < 0 ? (
                  <Pille farbe="bg-red-100 text-red-700">überfällig seit {-tage} Tagen</Pille>
                ) : v.status === "AKTIV" && tage <= 30 ? (
                  <Pille farbe="bg-amber-100 text-amber-800">in {tage} Tagen</Pille>
                ) : (
                  <span className="text-muted">{v.naechsteWartung.toLocaleDateString("de-CH")}</span>
                )}
              </td>
              <td className="hidden p-2 text-right tabular-nums lg:table-cell">{v.preis > 0 ? chf(v.preis) : "—"}</td>
              <td className="p-2"><Pille farbe={statusFarben[v.status]}>{statusText[v.status] ?? v.status}</Pille></td>
              <td className="p-2 text-right">
                <span className="inline-flex flex-wrap items-center justify-end gap-1">
                  {v.status === "AKTIV" && (
                    <form action={wartungAuftragErstellen}>
                      <input type="hidden" name="vertragId" value={v.id} />
                      <button className="whitespace-nowrap rounded-md bg-gold px-2 py-1 text-xs font-semibold text-ink hover:bg-gold-soft">⚡ Auftrag erstellen</button>
                    </form>
                  )}
                  {v.status !== "GEKUENDIGT" ? (
                    <>
                      <form action={setWartungsvertragStatus}>
                        <input type="hidden" name="vertragId" value={v.id} />
                        <input type="hidden" name="status" value={v.status === "AKTIV" ? "PAUSIERT" : "AKTIV"} />
                        <button className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">
                          {v.status === "AKTIV" ? "Pausieren" : "Aktivieren"}
                        </button>
                      </form>
                      <form action={setWartungsvertragStatus}>
                        <input type="hidden" name="vertragId" value={v.id} />
                        <input type="hidden" name="status" value="GEKUENDIGT" />
                        <button className="whitespace-nowrap rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Kündigen</button>
                      </form>
                    </>
                  ) : (
                    <>
                      <form action={setWartungsvertragStatus}>
                        <input type="hidden" name="vertragId" value={v.id} />
                        <input type="hidden" name="status" value="AKTIV" />
                        <button className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">Reaktivieren</button>
                      </form>
                      <form action={deleteWartungsvertrag}>
                        <input type="hidden" name="vertragId" value={v.id} />
                        <button className="px-1 text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                      </form>
                    </>
                  )}
                </span>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={8}>
              Keine Wartungsverträge. <Link href="/wartung/neu" className="text-forest underline">Ersten Vertrag erfassen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden md:table-cell" />
              <td />
              <td className="hidden p-2 text-right tabular-nums lg:table-cell">{chf(summePreis)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
