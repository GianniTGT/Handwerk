export const dynamic = "force-dynamic";

import Link from "next/link";
import { Leer } from "@/components/Liste";
import { Ik } from "@/components/Icons";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { faelligDatum, istUeberfaellig } from "@/lib/faellig";
import { MAHNSTUFEN, offenerBetrag } from "@/lib/mahnwesen";
import { rechnungNr } from "@/lib/nrtext";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  VERSENDET: "bg-blue-100 text-blue-800",
  BEZAHLT: "bg-green-100 text-green-800",
};
const statusText: Record<string, string> = { ENTWURF: "Entwurf", VERSENDET: "Offen", BEZAHLT: "Bezahlt" };
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["entwurf", "Entwürfe"],
  ["offen", "Offen"],
  ["ueberfaellig", "Überfällig"],
  ["bezahlt", "Bezahlt"],
];

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", q: qRoh = "", fehler } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const alle = await db.rechnung.findMany({
    where: { betriebId: betrieb.id },
    include: { auftrag: { include: { kunde: true } }, gutschriften: true },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 500,
  });
  const zeilen = alle.map((r) => {
    const faellig = faelligDatum(r, betrieb.zahlungsfristTage);
    return {
      r,
      nr: rechnungNr(r),
      faellig,
      ueberfaellig: istUeberfaellig(faellig, r.status),
      offen: r.status === "BEZAHLT" ? 0 : offenerBetrag(r),
    };
  });
  const zaehler = {
    alle: zeilen.length,
    entwurf: zeilen.filter((x) => x.r.status === "ENTWURF").length,
    offen: zeilen.filter((x) => x.r.status === "VERSENDET" && !x.ueberfaellig).length,
    ueberfaellig: zeilen.filter((x) => x.ueberfaellig).length,
    bezahlt: zeilen.filter((x) => x.r.status === "BEZAHLT").length,
  };
  const sichtbar = zeilen.filter(
    (x) =>
      (filter === "entwurf"
        ? x.r.status === "ENTWURF"
        : filter === "offen"
          ? x.r.status === "VERSENDET" && !x.ueberfaellig
          : filter === "ueberfaellig"
            ? x.ueberfaellig
            : filter === "bezahlt"
              ? x.r.status === "BEZAHLT"
              : true) &&
      (!q || `${x.nr} ${x.r.auftrag.kunde.name} ${x.r.auftrag.titel}`.toLowerCase().includes(q))
  );
  const summeBrutto = sichtbar.reduce((s, x) => s + x.r.totalBrutto, 0);
  const summeOffen = sichtbar.reduce((s, x) => s + x.offen, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Rechnungen</h1>
        <Link href="/rechnungen/neu" className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
          ＋ Neue Rechnung
        </Link>
      </div>
      {fehler === "gutschrift-betrag" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          Gutschrift ungültig: Der Betrag übersteigt den Rechnungsbetrag (inkl. bereits erstellter Gutschriften).
        </p>
      )}
      {fehler === "gutschrift-entwurf" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          Für einen Entwurf kann keine Gutschrift erstellt werden — Rechnung zuerst als versendet markieren.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 text-sm">
          {TABS.map(([key, label]) => (
            <Link
              key={key}
              href={`/rechnungen?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 ${
                filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"
              } ${key === "ueberfaellig" && zaehler.ueberfaellig > 0 && filter !== key ? "text-red-700" : ""}`}
            >
              {label} ({zaehler[key as keyof typeof zaehler]})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={qRoh} placeholder="Suche: Nummer, Kontakt, Titel …" className="w-56 rounded border border-line p-1.5 text-sm" />
          <button className="rounded bg-forest px-3 text-sm font-medium text-white">Suchen</button>
        </form>
      </div>

      <div className="mt-3 overflow-hidden rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-2">Nr.</th>
              <th className="hidden p-2 sm:table-cell">Datum</th>
              <th className="p-2">Kontakt</th>
              <th className="hidden p-2 lg:table-cell">Fällig</th>
              <th className="hidden p-2 text-right md:table-cell">Brutto CHF</th>
              <th className="p-2 text-right">Offen CHF</th>
              <th className="p-2">Status</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sichtbar.map(({ r, nr, faellig, ueberfaellig, offen }) => (
              <tr key={r.id} className="hover:bg-surface2">
                <td className="whitespace-nowrap p-2 font-medium">
                  <Link href={`/rechnungen/${r.id}`} className="block hover:underline">
                    {nr}
                    {r.art === "TEIL" && <span className="ml-1 text-[10px] font-normal text-muted">Akonto</span>}
                  </Link>
                </td>
                <td className="hidden p-2 text-muted sm:table-cell">{r.datum.toLocaleDateString("de-CH")}</td>
                <td className="p-2">{r.auftrag.kunde.name}</td>
                <td className={`hidden p-2 lg:table-cell ${ueberfaellig ? "font-medium text-red-700" : "text-muted"}`}>
                  {r.status === "ENTWURF" ? "" : faellig.toLocaleDateString("de-CH")}
                </td>
                <td className="hidden p-2 text-right tabular-nums md:table-cell">{chf(r.totalBrutto)}</td>
                <td className="p-2 text-right tabular-nums">{chf(offen)}</td>
                <td className="p-2">
                  <span className="flex flex-wrap gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ueberfaellig ? "bg-red-100 text-red-800" : (statusFarben[r.status] ?? "")}`}>
                      {ueberfaellig ? "Überfällig" : (statusText[r.status] ?? r.status)}
                    </span>
                    {r.mahnstufe > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{MAHNSTUFEN[r.mahnstufe]}</span>
                    )}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <a href={`/api/rechnungen/${r.id}/pdf`} target="_blank" title="PDF mit QR-Rechnung" className="hover:opacity-70">
                    <Ik name="pdf" />
                  </a>
                </td>
              </tr>
            ))}
            {sichtbar.length === 0 && (
              q || filter !== "alle" ? (
                <Leer colSpan={8}>Keine Rechnungen zu dieser Auswahl.</Leer>
              ) : (
                <Leer colSpan={8} icon="verkauf" titel="Sie haben noch keine Rechnungen erstellt.">
                  Rechnungen entstehen aus Aufträgen: <Link href="/rechnungen/neu">Auftrag wählen und Rechnung erstellen</Link>. Die QR-Rechnung als PDF ist
                  sofort bereit.
                </Leer>
              )
            )}
          </tbody>
          {sichtbar.length > 0 && (
            <tfoot className="bg-surface2 text-sm font-semibold">
              <tr>
                <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
                <td className="hidden p-2 lg:table-cell" colSpan={2} />
                <td className="hidden p-2 text-right tabular-nums md:table-cell">{chf(summeBrutto)}</td>
                <td className="p-2 text-right tabular-nums">{chf(summeOffen)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
