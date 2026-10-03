export const dynamic = "force-dynamic";

import { rechnungNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { sendeRechnungEmail, setRechnungStatus } from "@/lib/actions";
import { faelligDatum, istUeberfaellig, tageUeberfaellig } from "@/lib/faellig";
import Link from "next/link";
import { fuelle, ladeVorlagen } from "@/lib/mailvorlagen";
import { createGutschrift } from "@/lib/actions-verkauf";
import { MAHNSTUFEN, offenerBetrag } from "@/lib/mahnwesen";
import EmailForm, { EmailStatusBanner } from "@/components/EmailForm";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  VERSENDET: "bg-blue-100 text-blue-800",
  BEZAHLT: "bg-green-100 text-green-800",
};

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; filter?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { email, filter = "alle", fehler } = await searchParams;
  const alle = await db.rechnung.findMany({
    where: { betriebId: betrieb.id },
    include: { auftrag: { include: { kunde: true } }, gutschriften: true },
    orderBy: { nummer: "desc" },
  });
  const vorlagen = await ladeVorlagen(betrieb.id);
  const rechnungWerte = (r: (typeof alle)[number]) => ({
    KUNDE: r.auftrag.kunde.name,
    NUMMER: rechnungNr(r),
    TITEL: r.auftrag.titel,
    BETRAG: chf(offenerBetrag(r)),
    FAELLIG: faelligDatum(r, betrieb.zahlungsfristTage).toLocaleDateString("de-CH"),
    FIRMA: betrieb.name,
  });
  const mitFrist = alle.map((r) => {
    const faellig = faelligDatum(r, betrieb.zahlungsfristTage);
    return { r, faellig, ueberfaellig: istUeberfaellig(faellig, r.status) };
  });
  const zaehler = {
    alle: mitFrist.length,
    entwurf: mitFrist.filter((x) => x.r.status === "ENTWURF").length,
    offen: mitFrist.filter((x) => x.r.status === "VERSENDET" && !x.ueberfaellig).length,
    ueberfaellig: mitFrist.filter((x) => x.ueberfaellig).length,
    bezahlt: mitFrist.filter((x) => x.r.status === "BEZAHLT").length,
  };
  const sichtbar = mitFrist.filter(({ r, ueberfaellig }) =>
    filter === "entwurf" ? r.status === "ENTWURF"
    : filter === "offen" ? r.status === "VERSENDET" && !ueberfaellig
    : filter === "ueberfaellig" ? ueberfaellig
    : filter === "bezahlt" ? r.status === "BEZAHLT"
    : true
  );
  const tabs: [string, string][] = [
    ["alle", "Alle"], ["entwurf", "Entwurf"], ["offen", "Offen"], ["ueberfaellig", "Überfällig"], ["bezahlt", "Bezahlt"],
  ];

  return (
    <div>
      <h1 className="text-xl font-bold">Rechnungen</h1>
      <div className="mt-3"><EmailStatusBanner status={email} /></div>
      {fehler === "gutschrift-betrag" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Gutschrift ungültig: Der Betrag übersteigt den Rechnungsbetrag (inkl. bereits erstellter Gutschriften).</p>
      )}
      {fehler === "gutschrift-entwurf" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Für einen Entwurf kann keine Gutschrift erstellt werden — Rechnung zuerst als versendet markieren.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1 text-sm">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/rechnungen?filter=${key}`}
            className={`rounded-full border px-3 py-1 ${
              filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"
            } ${key === "ueberfaellig" && zaehler.ueberfaellig > 0 && filter !== key ? "text-red-700" : ""}`}
          >
            {label} ({zaehler[key as keyof typeof zaehler]})
          </Link>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {sichtbar.map(({ r, faellig, ueberfaellig }) => (
          <li key={r.id} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">
                {r.art === "TEIL" ? "Teilrechnung" : "Rechnung"} {rechnungNr(r)} — {r.auftrag.kunde.name}
              </div>
              <div className="text-sm text-muted">
                Auftrag #{r.auftrag.nummer} · {r.datum.toLocaleDateString("de-CH")} · netto CHF{" "}
                {chf(r.totalNetto)} · <strong>brutto CHF {chf(r.totalBrutto)}</strong>
                {r.gutschriften.length > 0 && (
                  <span> · Gutschrift CHF {chf(r.gutschriften.reduce((s, g) => s + g.totalBrutto, 0))} → offen CHF {chf(offenerBetrag(r))}</span>
                )}
                {r.status !== "ENTWURF" && (
                  <span className={ueberfaellig ? "font-medium text-red-700" : ""}>
                    {" "}· fällig {faellig.toLocaleDateString("de-CH")}
                    {ueberfaellig && ` (${tageUeberfaellig(faellig)} Tage überfällig)`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ueberfaellig ? "bg-red-100 text-red-800" : statusFarben[r.status] ?? ""}`}>
                {ueberfaellig ? "ÜBERFÄLLIG" : r.status}
              </span>
              {r.mahnstufe > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {MAHNSTUFEN[r.mahnstufe]}
                </span>
              )}
              <a
                href={`/api/rechnungen/${r.id}/pdf`}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-lift"
              >
                📄 PDF mit QR
              </a>
              {r.status !== "BEZAHLT" && (
                <form action={setRechnungStatus}>
                  <input type="hidden" name="rechnungId" value={r.id} />
                  <input type="hidden" name="status" value={r.status === "ENTWURF" ? "VERSENDET" : "BEZAHLT"} />
                  <button className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface2">
                    {r.status === "ENTWURF" ? "Als versendet markieren" : "Als bezahlt markieren"}
                  </button>
                </form>
              )}
            </div>
            </div>
            {r.status !== "ENTWURF" && (
              <details className="mt-2 rounded-tiff border border-line bg-white">
                <summary className="cursor-pointer select-none p-3 text-sm font-semibold hover:bg-surface2">
                  ↩️ Gutschrift erstellen
                </summary>
                <form action={createGutschrift} className="grid gap-2 border-t border-line p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="rechnungId" value={r.id} />
                  <input name="grund" placeholder="Grund (z.B. Preisnachlass)" className="rounded border border-line p-2 text-sm" />
                  <input
                    name="betragBrutto"
                    inputMode="decimal"
                    placeholder={`Betrag brutto (leer = offen CHF ${chf(offenerBetrag(r))})`}
                    className="rounded border border-line p-2 text-sm"
                  />
                  <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
                    Erstellen
                  </button>
                </form>
              </details>
            )}
            <div className="mt-2">
              <EmailForm
                action={sendeRechnungEmail}
                hiddenName="rechnungId"
                hiddenValue={r.id}
                an={r.auftrag.kunde.email}
                betreff={fuelle(vorlagen.RECHNUNG.betreff, rechnungWerte(r))}
                text={fuelle(vorlagen.RECHNUNG.text, rechnungWerte(r))}
              />
            </div>
          </li>
        ))}
        {sichtbar.length === 0 && (
          <li className="p-3 text-sm text-muted">
            Noch keine Rechnungen — erstelle sie direkt aus einem Auftrag.
          </li>
        )}
      </ul>
    </div>
  );
}
