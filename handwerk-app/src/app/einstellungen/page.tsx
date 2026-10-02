export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";
import { updateBetrieb } from "@/lib/actions";

const fehlerTexte: Record<string, string> = {
  "logo-gross": "Logo zu gross — max. 500 KB.",
  "logo-format": "Nur PNG oder JPEG als Logo.",
};

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;

  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">Einstellungen & Dokumenten-Designer</h1>
      <p className="mt-1 text-sm text-muted">
        Firmendaten, Logo und Farben — erscheinen auf Offerten und Rechnungen.
      </p>

      {sp.gespeichert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {fehlerTexte[sp.fehler] ?? "Speichern fehlgeschlagen."}
        </p>
      )}

      <form action={updateBetrieb} className="mt-4 grid gap-6">
        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Firmendaten</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="name" defaultValue={betrieb.name} placeholder="Firmenname" className={`${feld} md:col-span-2`} />
            <input name="strasse" defaultValue={betrieb.strasse} placeholder="Strasse" className={feld} />
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <input name="plz" defaultValue={betrieb.plz} placeholder="PLZ" className={feld} />
              <input name="ort" defaultValue={betrieb.ort} placeholder="Ort" className={feld} />
            </div>
            <input name="telefon" defaultValue={betrieb.telefon} placeholder="Telefon" className={feld} />
            <input name="email" defaultValue={betrieb.email} placeholder="E-Mail" className={feld} />
            <input name="mwstNr" defaultValue={betrieb.mwstNr} placeholder="MwSt-Nr. (CHE-…)" className={`${feld} md:col-span-2`} />
          </div>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Bank & QR-Rechnung</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="iban" defaultValue={betrieb.iban} placeholder="IBAN / QR-IBAN" className={`${feld} md:col-span-2`} />
            <input name="bank" defaultValue={betrieb.bank} placeholder="Bank (z.B. UBS Switzerland AG)" className={feld} />
            <input name="bic" defaultValue={betrieb.bic} placeholder="BIC" className={feld} />
            <label className="grid gap-0.5 text-xs text-muted">
              Zahlungsfrist neue Rechnungen (Tage)
              <input name="zahlungsfristTage" type="number" min={0} max={365} defaultValue={betrieb.zahlungsfristTage} className={feld} />
            </label>
          </div>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Mahnwesen</h2>
          <p className="mt-1 text-xs text-muted">Tage bis zur jeweils nächsten Stufe (wie bei bexio: 14 / 10 / 7).</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(
              [
                ["mahnfrist1Tage", "Zahlungserinnerung nach Fälligkeit", betrieb.mahnfrist1Tage],
                ["mahnfrist2Tage", "1. Mahnung nach Erinnerung", betrieb.mahnfrist2Tage],
                ["mahnfrist3Tage", "2. Mahnung nach 1. Mahnung", betrieb.mahnfrist3Tage],
              ] as const
            ).map(([name, label, wert]) => (
              <label key={name} className="grid gap-0.5 text-xs text-muted">
                {label} (Tage)
                <input name={name} type="number" min={0} max={365} defaultValue={wert} className={feld} />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Kopf- und Fusstexte der Dokumente</h2>
          <p className="mt-1 text-xs text-muted">Leer lassen = Standardtext.</p>
          <div className="mt-3 grid gap-2">
            <textarea name="rechnungKopftext" defaultValue={betrieb.rechnungKopftext} rows={2} placeholder="Rechnung — Kopftext" className={feld} />
            <textarea name="rechnungFusstext" defaultValue={betrieb.rechnungFusstext} rows={2} placeholder="Rechnung — Fusstext" className={feld} />
            <textarea name="offerteKopftext" defaultValue={betrieb.offerteKopftext} rows={2} placeholder="Offerte — Kopftext" className={feld} />
            <textarea name="offerteFusstext" defaultValue={betrieb.offerteFusstext} rows={2} placeholder="Offerte — Fusstext" className={feld} />
          </div>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Dokumentenlogo</h2>
          <div className="mt-3 flex items-center gap-4">
            {betrieb.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={betrieb.logo} alt="Logo" className="h-16 rounded border border-line bg-white p-1" />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-line text-xs text-muted">
                kein Logo
              </div>
            )}
            <div className="grid gap-1 text-sm">
              <input name="logo" type="file" accept="image/png,image/jpeg" className="text-sm" />
              <span className="text-xs text-muted">PNG oder JPEG, max. 500 KB</span>
              {betrieb.logo && (
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" name="logoEntfernen" value="1" /> Logo entfernen
                </label>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Farben (wie bei bexio: Titel, Linien, Text)</h2>
          <div className="mt-3 grid grid-cols-3 gap-4">
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

        <button className="rounded bg-forest p-2.5 text-sm font-semibold text-white hover:bg-forest-lift">
          Speichern
        </button>
      </form>
    </div>
  );
}
