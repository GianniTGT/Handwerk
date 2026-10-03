// Gemeinsames Formular für Produkt/Dienstleistung anlegen und bearbeiten (server component, gegliedert wie bei bexio)
import { saveArtikel } from "@/lib/actions";

type ArtikelWerte = {
  id?: string;
  art?: string;
  bezeichnung?: string;
  artikelNr?: string;
  einheit?: string;
  gruppe?: string;
  einkaufspreis?: number;
  zuschlagProzent?: number;
  preis?: number;
  mwstSatz?: number;
  lieferantId?: string | null;
  lieferantIstKatalog?: boolean;
};

const feld = "w-full rounded border border-line bg-white p-2 text-sm";

function Pflicht({ label }: { label: string }) {
  return label.trim().endsWith("*") ? (
    <>
      {label.trim().slice(0, -1).trim()} <span className="text-red-600">*</span>
    </>
  ) : (
    <>{label}</>
  );
}

function Zeile({ label, children, voll }: { label: string; children: React.ReactNode; voll?: boolean }) {
  return (
    <label className={`grid gap-0.5 text-xs text-muted ${voll ? "col-span-full" : ""}`}>
      <Pflicht label={label} />
      {children}
    </label>
  );
}

export default function ArtikelForm({
  a = {},
  lieferanten,
  abbrechenHref,
}: {
  a?: ArtikelWerte;
  lieferanten: { id: string; name: string }[];
  abbrechenHref: string;
}) {
  // Bei Katalogartikeln (Lieferant + Bruttopreis) kommt der EK aus Katalog und Rabatt — nur Zuschlag ist editierbar
  const ek = a.einkaufspreis && a.einkaufspreis > 0 ? a.einkaufspreis : !a.lieferantIstKatalog && a.preis ? a.preis : "";

  return (
    <form action={saveArtikel} className="grid gap-4">
      {a.id && <input type="hidden" name="artikelId" value={a.id} />}
      <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Stammdaten</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Zeile label="Produktart">
            <select name="art" defaultValue={a.art ?? "WARE"} className={feld}>
              <option value="WARE">Ware</option>
              <option value="DIENSTLEISTUNG">Dienstleistung</option>
            </select>
          </Zeile>
          <Zeile label="Produktcode / Art-Nr">
            <input name="artikelNr" defaultValue={a.artikelNr} className={feld} />
          </Zeile>
          <Zeile label="Produktname *" voll>
            <input name="bezeichnung" required defaultValue={a.bezeichnung} className={feld} />
          </Zeile>
          <Zeile label="Gruppe">
            <input name="gruppe" defaultValue={a.gruppe} placeholder="z.B. Heizung, Sanitär" className={feld} />
          </Zeile>
          <Zeile label="Einheit">
            <input name="einheit" defaultValue={a.einheit ?? "Stk."} list="einheiten" className={feld} />
            <datalist id="einheiten">
              {["Stk.", "Std.", "m", "m²", "kg", "pauschal", "Satz"].map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </Zeile>
        </div>
      </section>

      <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Preise</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Zeile label="Einkaufspreis (EK) CHF">
            <input name="einkaufspreis" inputMode="decimal" defaultValue={ek} className={feld} />
          </Zeile>
          <Zeile label="Zuschlag %">
            <input name="zuschlagProzent" inputMode="decimal" defaultValue={a.zuschlagProzent ? String(a.zuschlagProzent) : ""} className={feld} />
          </Zeile>
          <Zeile label="Verkaufspreis (VK) CHF">
            <input name="verkaufspreis" inputMode="decimal" placeholder="wird berechnet" className={feld} />
          </Zeile>
          <p className="text-xs text-muted sm:col-span-3">
            EK + Zuschlag <b>oder</b> EK + VK angeben — der jeweils fehlende Wert wird berechnet. Dienstleistung ohne EK: nur VK eintragen.
            {a.lieferantIstKatalog && " Katalogartikel: Der EK ergibt sich aus Bruttopreis und Lieferanten-Rabatt."}
          </p>
          <Zeile label="MwSt">
            <select name="mwstSatz" defaultValue={String(a.mwstSatz ?? 8.1)} className={feld}>
              <option value="8.1">8.1 %</option>
              <option value="2.6">2.6 %</option>
              <option value="3.8">3.8 %</option>
              <option value="0">0 %</option>
            </select>
          </Zeile>
        </div>
      </section>

      <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Lieferantendaten</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Zeile label="Lieferant">
            <select name="lieferantId" defaultValue={a.lieferantId ?? ""} className={feld}>
              <option value="">— kein Lieferant —</option>
              {lieferanten.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Zeile>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-tiff md:border">
        <button className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
        <a href={abbrechenHref} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
          Abbrechen
        </a>
      </div>
    </form>
  );
}
