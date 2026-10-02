// Gemeinsame Formularfelder für Kontakt anlegen/bearbeiten (server component)
type KundeWerte = {
  name?: string;
  typ?: string;
  kategorie?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  mobile?: string;
  email?: string;
  website?: string;
  bemerkung?: string;
};

export const KATEGORIEN = ["Privatkunde", "Hausverwaltung", "Gewerbe", "Bauherr", "Lieferant", "Architekt"];

export default function KundeFelder({ k = {} }: { k?: KundeWerte }) {
  const feld = "rounded border border-line p-2 text-sm";
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <select name="typ" defaultValue={k.typ ?? "FIRMA"} className={feld}>
          <option value="FIRMA">Firma</option>
          <option value="PRIVAT">Privat</option>
        </select>
        <input name="kategorie" list="kategorien" defaultValue={k.kategorie} placeholder="Kategorie" className={feld} />
        <datalist id="kategorien">
          {KATEGORIEN.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <input name="name" required defaultValue={k.name} placeholder="Name / Firma *" className={feld} />
      <input name="strasse" defaultValue={k.strasse} placeholder="Strasse und Nr." className={feld} />
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <input name="plz" defaultValue={k.plz} placeholder="PLZ" className={feld} />
        <input name="ort" defaultValue={k.ort} placeholder="Ort" className={feld} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="telefon" defaultValue={k.telefon} placeholder="Telefon" className={feld} />
        <input name="mobile" defaultValue={k.mobile} placeholder="Mobile" className={feld} />
      </div>
      <input name="email" type="email" defaultValue={k.email} placeholder="E-Mail" className={feld} />
      <input name="website" defaultValue={k.website} placeholder="Website" className={feld} />
      <textarea name="bemerkung" rows={2} defaultValue={k.bemerkung} placeholder="Bemerkungen" className={feld} />
    </div>
  );
}
