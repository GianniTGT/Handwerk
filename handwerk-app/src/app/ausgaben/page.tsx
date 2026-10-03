export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteAusgabe, setAusgabeStatus } from "@/lib/actions-buero";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

export default async function AusgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const filter = sp.filter ?? "alle";
  const q = (sp.q ?? "").trim().toLowerCase();
  const [alle, projekte] = await Promise.all([
    db.ausgabe.findMany({
      where: { betriebId: betrieb.id },
      orderBy: [{ datum: "desc" }, { erstellt: "desc" }],
      take: 500,
    }),
    db.projekt.findMany({ where: { betriebId: betrieb.id }, select: { id: true, name: true } }),
  ]);
  // Ausgabe kennt nur die Projekt-ID — Namen hier nachschlagen
  const projektName = new Map(projekte.map((p) => [p.id, p.name]));
  const heute = new Date();
  const zeilen = alle.map((a) => ({
    a,
    projekt: a.projektId && projektName.has(a.projektId) ? { id: a.projektId, name: projektName.get(a.projektId)! } : null,
    ueberfaellig: a.status === "OFFEN" && !!a.faelligAm && a.faelligAm < heute,
  }));
  const reiter = [
    { key: "alle", label: "Alle", anzahl: zeilen.length },
    { key: "offen", label: "Offen", anzahl: zeilen.filter((z) => z.a.status === "OFFEN").length },
    { key: "ueberfaellig", label: "Überfällig", anzahl: zeilen.filter((z) => z.ueberfaellig).length, warn: true },
    { key: "bezahlt", label: "Bezahlt", anzahl: zeilen.filter((z) => z.a.status === "BEZAHLT").length },
  ];
  const sichtbar = zeilen.filter(
    (z) =>
      (filter === "offen" ? z.a.status === "OFFEN" : filter === "ueberfaellig" ? z.ueberfaellig : filter === "bezahlt" ? z.a.status === "BEZAHLT" : true) &&
      (!q || `${z.a.beschreibung} ${z.a.lieferant} ${z.a.kategorie} ${z.projekt?.name ?? ""}`.toLowerCase().includes(q))
  );
  const summe = sichtbar.reduce((s, z) => s + z.a.betragBrutto, 0);
  const summeOffen = sichtbar.filter((z) => z.a.status === "OFFEN").reduce((s, z) => s + z.a.betragBrutto, 0);

  return (
    <div>
      <ListenKopf
        titel="Ausgaben"
        untertitel="Lieferantenrechnungen und Betriebskosten. Belege aus dem Posteingang lassen sich direkt als Ausgabe verbuchen."
        neuHref="/ausgaben/neu"
        neuLabel="Neue Ausgabe"
        menue={
          <div className="grid gap-1 text-sm">
            <Link href="/posteingang" className="text-forest underline">Posteingang: Belege hochladen</Link>
            {/* Download-Route, kein Seitenwechsel */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/export/ausgaben" className="text-forest underline">⬇ Ausgaben exportieren (CSV)</a>
          </div>
        }
      />
      {sp.gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      <ReiterUndSuche basis="/ausgaben" aktiv={filter} q={sp.q ?? ""} suchePlatzhalter="Suche: Beschreibung, Lieferant, Projekt …" reiter={reiter} />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="hidden p-2 sm:table-cell">Datum</th>
            <th className="p-2">Beschreibung</th>
            <th className="hidden p-2 md:table-cell">Lieferant</th>
            <th className="hidden p-2 lg:table-cell">Kategorie</th>
            <th className="hidden p-2 lg:table-cell">Fällig</th>
            <th className="p-2 text-right">Brutto CHF</th>
            <th className="p-2">Status</th>
            <th className="w-28 p-2" />
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ a, projekt, ueberfaellig }) => (
            <tr key={a.id} className="hover:bg-surface2">
              <td className="hidden whitespace-nowrap p-2 text-muted sm:table-cell">{a.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2 font-medium">
                {a.beschreibung}
                {projekt && (
                  <span className="block text-xs font-normal text-muted">
                    Projekt: <Link href={`/projekte/${projekt.id}`} className="hover:underline">{projekt.name}</Link>
                  </span>
                )}
              </td>
              <td className="hidden p-2 text-muted md:table-cell">{a.lieferant || "—"}</td>
              <td className="hidden p-2 text-muted lg:table-cell">{a.kategorie}</td>
              <td className={`hidden p-2 lg:table-cell ${ueberfaellig ? "font-medium text-red-700" : "text-muted"}`}>
                {a.faelligAm ? a.faelligAm.toLocaleDateString("de-CH") : "—"}
              </td>
              <td className="p-2 text-right tabular-nums">{chf(a.betragBrutto)}</td>
              <td className="p-2">
                <Pille farbe={a.status === "BEZAHLT" ? "bg-green-100 text-green-800" : ueberfaellig ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                  {a.status === "BEZAHLT" ? "Bezahlt" : ueberfaellig ? "Überfällig" : "Offen"}
                </Pille>
              </td>
              <td className="p-2 text-right">
                <span className="inline-flex items-center gap-1">
                  <form action={setAusgabeStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value={a.status === "BEZAHLT" ? "OFFEN" : "BEZAHLT"} />
                    <button className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">
                      {a.status === "BEZAHLT" ? "Wieder öffnen" : "Als bezahlt"}
                    </button>
                  </form>
                  <form action={deleteAusgabe}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="px-1 text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                  </form>
                </span>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={8}>
              Keine Ausgaben. <Link href="/ausgaben/neu" className="text-forest underline">Neue Ausgabe erfassen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="hidden sm:table-cell" />
              <td className="p-2">Total ({sichtbar.length}) · davon offen CHF {chf(summeOffen)}</td>
              <td className="hidden md:table-cell" />
              <td className="hidden lg:table-cell" />
              <td className="hidden lg:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summe)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
