export const dynamic = "force-dynamic";

import Link from "next/link";
import { darf } from "@/lib/rechte";
import { sitzungErforderlich } from "@/lib/auth";
import { updateBetrieb } from "@/lib/actions";
import { saveStundensaetze } from "@/lib/actions-projekte";
import { db } from "@/lib/db";
import { saveMailvorlagen } from "@/lib/actions-mail";
import { MAIL_TYPEN, PLATZHALTER, ladeVorlagen } from "@/lib/mailvorlagen";
import { saveNummernkreise } from "@/lib/actions-nummern";
import { holeKreis } from "@/lib/nummern";
import { NR_STANDARD, formatNr, type NrTyp } from "@/lib/nrtext";
import LogoUpload from "@/components/LogoUpload";
import { Hinweis } from "@/components/Liste";

const fehlerTexte: Record<string, string> = {
  "logo-gross": "Logo zu gross — bitte ein kleineres Bild wählen.",
  "logo-format": "Nur PNG oder JPEG als Logo.",
  iban: "IBAN ungültig — für die QR-Rechnung ist eine Schweizer oder liechtensteinische IBAN nötig (z.B. CH58 0079 1123 0008 8901 2).",
  nummernformat: "Nummernformat ungültig — es muss {NR} enthalten und darf nur Buchstaben, Ziffern und - _ . / # enthalten.",
  recht: "Keine Berechtigung für diese Einstellung.",
  "mail-zu-lang": "Betreff oder Text einer Mailvorlage ist zu lang.",
};

const feld = "w-full rounded border border-line bg-white p-2 text-sm";
const karte = "rounded-tiff border border-line bg-white p-4 shadow-sm";
const knopfRuhig = "mt-3 rounded-md border border-forest px-4 py-2 text-sm font-semibold text-forest hover:bg-surface2";

function Feld({ label, children, voll }: { label: string; children: React.ReactNode; voll?: boolean }) {
  return (
    <label className={`grid gap-0.5 text-xs text-muted ${voll ? "sm:col-span-2" : ""}`}>
      {label.trim().endsWith("*") ? <span>{label.trim().slice(0, -1).trim()} <span className="text-red-600">*</span></span> : <span>{label}</span>}
      {children}
    </label>
  );
}

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const sp = await searchParams;
  const kreise = await Promise.all((Object.keys(NR_STANDARD) as NrTyp[]).map((t) => holeKreis(betrieb.id, t)));
  const mailVorlagen = await ladeVorlagen(betrieb.id);
  const team = await db.mitarbeiter.findMany({ where: { betriebId: betrieb.id }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Einstellungen</h1>
          <p className="mt-1 text-sm text-muted">Firmendaten, Logo, Farben und Texte für Offerten und Rechnungen. Jeder Block hat seinen eigenen Speichern-Knopf.</p>
        </div>
        {darf(mitarbeiter, "BENUTZER") && (
          <Link href="/einstellungen/benutzer" className="rounded-md border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2">
            Benutzer &amp; Rechte verwalten
          </Link>
        )}
        <Link href="/import" className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-surface2">
          Datenübernahme
        </Link>
      </div>
      {sp.gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      {sp.fehler && <Hinweis art="fehler">{fehlerTexte[sp.fehler] ?? "Speichern fehlgeschlagen."}</Hinweis>}

      {/* Betrieb & Dokumente: ein Formular, Karten nebeneinander, Speichern-Leiste bleibt unten sichtbar */}
      <form action={updateBetrieb} className="mt-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <section className={karte}>
            <h2 className="font-semibold">Firmendaten</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Feld label="Firmenname" voll><input name="name" defaultValue={betrieb.name} className={feld} /></Feld>
              <Feld label="Strasse" voll><input name="strasse" defaultValue={betrieb.strasse} className={feld} /></Feld>
              <Feld label="PLZ"><input name="plz" defaultValue={betrieb.plz} className={feld} /></Feld>
              <Feld label="Ort"><input name="ort" defaultValue={betrieb.ort} className={feld} /></Feld>
              <Feld label="Telefon"><input name="telefon" defaultValue={betrieb.telefon} className={feld} /></Feld>
              <Feld label="E-Mail"><input name="email" defaultValue={betrieb.email} className={feld} /></Feld>
              <Feld label="MwSt-Nr. (CHE-…)" voll><input name="mwstNr" defaultValue={betrieb.mwstNr} className={feld} /></Feld>
            </div>
          </section>

          <section className={karte}>
            <h2 className="font-semibold">Bank &amp; QR-Rechnung</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Feld label="IBAN / QR-IBAN" voll><input name="iban" defaultValue={betrieb.iban} placeholder="CH58 0079 1123 0008 8901 2" className={feld} /></Feld>
              <Feld label="Bank"><input name="bank" defaultValue={betrieb.bank} placeholder="z.B. UBS Switzerland AG" className={feld} /></Feld>
              <Feld label="BIC"><input name="bic" defaultValue={betrieb.bic} className={feld} /></Feld>
              <Feld label="Zahlungsfrist neue Rechnungen (Tage)">
                <input name="zahlungsfristTage" type="number" min={0} max={365} defaultValue={betrieb.zahlungsfristTage} className={feld} />
              </Feld>
            </div>
            <h2 className="mt-5 font-semibold">Mahnwesen</h2>
            <p className="mt-1 text-xs text-muted">Tage bis zur jeweils nächsten Stufe (wie bei bexio: 14 / 10 / 7).</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["mahnfrist1Tage", "Erinnerung nach Fälligkeit", betrieb.mahnfrist1Tage],
                  ["mahnfrist2Tage", "1. Mahnung danach", betrieb.mahnfrist2Tage],
                  ["mahnfrist3Tage", "2. Mahnung danach", betrieb.mahnfrist3Tage],
                ] as const
              ).map(([name, label, wert]) => (
                <Feld key={name} label={label}>
                  <input name={name} type="number" min={0} max={365} defaultValue={wert} className={feld} />
                </Feld>
              ))}
            </div>
          </section>

          <section className={karte}>
            <h2 className="font-semibold">Logo &amp; Farben der Dokumente</h2>
            <div className="mt-3">
              <LogoUpload aktuell={betrieb.logo} />
            </div>
            <p className="mt-4 text-xs text-muted">Farben wie bei bexio: Titel, Linien, Text</p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {(
                [
                  ["farbeTitel", "Titel", betrieb.farbeTitel],
                  ["farbeLinien", "Linien", betrieb.farbeLinien],
                  ["farbeText", "Text", betrieb.farbeText],
                ] as const
              ).map(([name, label, wert]) => (
                <label key={name} className="grid gap-1 text-sm">
                  {label}
                  <input name={name} type="color" defaultValue={wert} className="h-10 w-full cursor-pointer rounded border border-line" />
                </label>
              ))}
            </div>
          </section>

          <section className={`${karte} xl:col-span-3`}>
            <h2 className="font-semibold">Kopf- und Fusstexte der Dokumente</h2>
            <p className="mt-1 text-xs text-muted">Leer lassen = Standardtext.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Feld label="Rechnung — Kopftext"><textarea name="rechnungKopftext" defaultValue={betrieb.rechnungKopftext} rows={2} className={feld} /></Feld>
              <Feld label="Offerte — Kopftext"><textarea name="offerteKopftext" defaultValue={betrieb.offerteKopftext} rows={2} className={feld} /></Feld>
              <Feld label="Rechnung — Fusstext"><textarea name="rechnungFusstext" defaultValue={betrieb.rechnungFusstext} rows={2} className={feld} /></Feld>
              <Feld label="Offerte — Fusstext"><textarea name="offerteFusstext" defaultValue={betrieb.offerteFusstext} rows={2} className={feld} /></Feld>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 rounded-tiff border border-line bg-paper/95 px-4 py-3 shadow-sm backdrop-blur">
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-forest px-6 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
          <span className="text-xs text-muted">Speichert Firmendaten, Bank, Mahnwesen, Logo, Farben und Texte.</span>
        </div>
      </form>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="grid content-start gap-4">
          <form action={saveNummernkreise} className={karte}>
            <h2 className="font-semibold">Nummernkreise</h2>
            <p className="mt-1 text-xs text-muted">
              Platzhalter: <code>{"{NR}"}</code> Nummer, <code>{"{JJJJ}"}</code> Jahr (2026), <code>{"{JJ}"}</code> Jahr (26). «Nächste Nummer» gilt nur für künftige
              Dokumente.
            </p>
            <div className="mt-3 grid gap-3">
              {kreise.map((k) => (
                <div key={k.typ} className="grid items-end gap-2 md:grid-cols-[100px_1.4fr_64px_90px_90px_auto]">
                  <div className="text-sm font-medium">{NR_STANDARD[k.typ as NrTyp].label}</div>
                  <Feld label="Format"><input name={`format_${k.typ}`} defaultValue={k.format} className={feld} /></Feld>
                  <Feld label="Stellen"><input name={`laenge_${k.typ}`} type="number" min={1} max={10} defaultValue={k.laenge} className={feld} /></Feld>
                  <Feld label="Nächste Nr."><input name={`naechste_${k.typ}`} type="number" min={1} defaultValue={k.naechste} className={feld} /></Feld>
                  <Feld label="Start/Jahr"><input name={`start_${k.typ}`} type="number" min={1} defaultValue={k.startNummer} className={feld} /></Feld>
                  <label className="flex items-center gap-1 pb-2 text-xs">
                    <input type="checkbox" name={`jaehrlich_${k.typ}`} value="1" defaultChecked={k.jaehrlichNeu} /> jährlich neu
                  </label>
                  <div className="text-xs text-muted md:col-span-6">
                    Vorschau: <strong>{formatNr(k.format, k.naechste, k.laenge)}</strong>
                  </div>
                </div>
              ))}
            </div>
            <button className={knopfRuhig}>Nummernkreise speichern</button>
          </form>

          <form action={saveStundensaetze} className={karte}>
            <h2 className="font-semibold">Stundensätze (Zeiterfassung)</h2>
            <p className="mt-1 text-xs text-muted">CHF pro Stunde je Mitarbeiter — wird beim Erfassen einer Zeit festgehalten und in die Rechnung übernommen.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {team.map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {m.name} <span className="text-xs text-muted">({m.rolle})</span>
                  </span>
                  <input name={`satz_${m.id}`} inputMode="decimal" defaultValue={m.stundensatz} className="w-24 rounded border border-line p-2 text-right text-sm" />
                </label>
              ))}
            </div>
            <button className={knopfRuhig}>Stundensätze speichern</button>
          </form>
        </div>

        <form action={saveMailvorlagen} className={`${karte} content-start`}>
          <h2 className="font-semibold">Mailvorlagen</h2>
          <p className="mt-1 text-xs text-muted">
            Vorlagen für den E-Mail-Versand von Offerten, Rechnungen und Mahnungen. Platzhalter:{" "}
            {PLATZHALTER.map((p) => (
              <code key={p} className="mr-1">{p}</code>
            ))}
            Beide Felder leeren = Standardtext.
          </p>
          <div className="mt-3 grid gap-2">
            {MAIL_TYPEN.map(({ typ, label }) => (
              <details key={typ} className="rounded border border-line">
                <summary className="cursor-pointer select-none p-2 text-sm font-medium hover:bg-surface2">{label}</summary>
                <div className="grid gap-2 border-t border-line p-2">
                  <input name={`betreff_${typ}`} defaultValue={mailVorlagen[typ].betreff} placeholder="Betreff" className={feld} />
                  <textarea name={`text_${typ}`} rows={7} defaultValue={mailVorlagen[typ].text} className={feld} />
                </div>
              </details>
            ))}
          </div>
          <button className={knopfRuhig}>Mailvorlagen speichern</button>
        </form>
      </div>
    </div>
  );
}
