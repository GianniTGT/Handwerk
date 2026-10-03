"use client";

import { useState } from "react";

// Formularfelder für Kontakt anlegen/bearbeiten — gegliedert wie bei bexio
// (Stammdaten, Kommunikation, Zusatzinformationen, Weitere Kontaktinformationen)
export type KundeWerte = {
  typ?: string;
  name?: string;
  anrede?: string;
  vorname?: string;
  nachname?: string;
  zusatz?: string;
  strasse?: string;
  adresszusatz?: string;
  plz?: string;
  ort?: string;
  land?: string;
  email?: string;
  email2?: string;
  telefon?: string;
  telefon2?: string;
  mobile?: string;
  website?: string;
  ansprechpartnerId?: string | null;
  kategorie?: string;
  branche?: string;
  korrespondenzweg?: string;
  sprache?: string;
  rabatt?: number;
  bemerkung?: string;
  anzahlMitarbeiter?: number | null;
  handelsregisterNr?: string;
  mwstNr?: string;
  uid?: string;
};

export const KATEGORIEN = ["Privatkunde", "Hausverwaltung", "Gewerbe", "Bauherr", "Lieferant", "Architekt"];

const feld = "w-full rounded border border-line bg-white p-2 text-sm";

function Zeile({ label, children, voll }: { label: string; children: React.ReactNode; voll?: boolean }) {
  return (
    <label className={`grid gap-0.5 text-xs text-muted ${voll ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{titel}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function KundeFelder({
  k = {},
  team = [],
}: {
  k?: KundeWerte;
  team?: { id: string; name: string }[];
}) {
  const [typ, setTyp] = useState(k.typ === "PRIVAT" ? "PRIVAT" : "FIRMA");
  const privat = typ === "PRIVAT";

  return (
    <div className="grid gap-4">
      <Abschnitt titel="Stammdaten">
        <Zeile label="Kontakttyp" voll>
          <div className="flex gap-4 py-1 text-sm text-ink">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="typ" value="FIRMA" checked={!privat} onChange={() => setTyp("FIRMA")} /> Firma
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="typ" value="PRIVAT" checked={privat} onChange={() => setTyp("PRIVAT")} /> Privatperson
            </label>
          </div>
        </Zeile>
        {privat ? (
          <>
            <Zeile label="Anrede">
              <select name="anrede" defaultValue={k.anrede ?? ""} className={feld}>
                <option value="">—</option>
                <option>Herr</option>
                <option>Frau</option>
                <option>Familie</option>
                <option>Divers</option>
              </select>
            </Zeile>
            <span className="hidden sm:block" />
            <Zeile label="Vorname">
              <input name="vorname" defaultValue={k.vorname} className={feld} />
            </Zeile>
            <Zeile label="Nachname *">
              <input name="nachname" required defaultValue={k.nachname} className={feld} />
            </Zeile>
          </>
        ) : (
          <>
            <Zeile label="Firma *" voll>
              <input name="name" required defaultValue={k.typ === "PRIVAT" ? "" : k.name} className={feld} />
            </Zeile>
            <Zeile label="Firmennamen-Zusatz" voll>
              <input name="zusatz" defaultValue={k.zusatz} className={feld} />
            </Zeile>
          </>
        )}
        <Zeile label="Strasse und Nr.">
          <input name="strasse" defaultValue={k.strasse} className={feld} />
        </Zeile>
        <Zeile label="Adresszusatz">
          <input name="adresszusatz" defaultValue={k.adresszusatz} className={feld} />
        </Zeile>
        <Zeile label="PLZ">
          <input name="plz" defaultValue={k.plz} inputMode="numeric" className={feld} />
        </Zeile>
        <Zeile label="Ort">
          <input name="ort" defaultValue={k.ort} className={feld} />
        </Zeile>
        <Zeile label="Land">
          <input name="land" defaultValue={k.land ?? "Schweiz"} className={feld} />
        </Zeile>
      </Abschnitt>

      <Abschnitt titel="Kommunikation">
        <Zeile label="E-Mail">
          <input name="email" type="email" defaultValue={k.email} className={feld} />
        </Zeile>
        <Zeile label="E-Mail 2">
          <input name="email2" type="email" defaultValue={k.email2} className={feld} />
        </Zeile>
        <Zeile label="Telefon">
          <input name="telefon" defaultValue={k.telefon} className={feld} />
        </Zeile>
        <Zeile label="Telefon 2">
          <input name="telefon2" defaultValue={k.telefon2} className={feld} />
        </Zeile>
        <Zeile label="Mobile">
          <input name="mobile" defaultValue={k.mobile} className={feld} />
        </Zeile>
        <Zeile label="Website">
          <input name="website" defaultValue={k.website} className={feld} />
        </Zeile>
      </Abschnitt>

      <Abschnitt titel="Zusatzinformationen">
        <Zeile label="Ansprechpartner (intern)">
          <select name="ansprechpartnerId" defaultValue={k.ansprechpartnerId ?? ""} className={feld}>
            <option value="">—</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Zeile>
        <Zeile label="Korrespondenzweg">
          <select name="korrespondenzweg" defaultValue={k.korrespondenzweg ?? "MAIL"} className={feld}>
            <option value="MAIL">E-Mail</option>
            <option value="POST">Post</option>
          </select>
        </Zeile>
        <Zeile label="Kategorie">
          <input name="kategorie" list="kategorien" defaultValue={k.kategorie} className={feld} />
          <datalist id="kategorien">
            {KATEGORIEN.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Zeile>
        <Zeile label="Branche">
          <input name="branche" defaultValue={k.branche} className={feld} />
        </Zeile>
        <Zeile label="Sprache">
          <select name="sprache" defaultValue={k.sprache ?? "DE"} className={feld}>
            <option value="DE">Deutsch</option>
            <option value="FR">Français</option>
            <option value="IT">Italiano</option>
            <option value="EN">English</option>
          </select>
        </Zeile>
        <Zeile label="Rabatt in %">
          <input name="rabatt" inputMode="decimal" defaultValue={k.rabatt ? String(k.rabatt) : ""} className={feld} />
        </Zeile>
        <Zeile label="Bemerkungen" voll>
          <textarea name="bemerkung" rows={3} defaultValue={k.bemerkung} className={feld} />
        </Zeile>
      </Abschnitt>

      <Abschnitt titel="Weitere Kontaktinformationen">
        <Zeile label="Anzahl Mitarbeitende">
          <input name="anzahlMitarbeiter" inputMode="numeric" defaultValue={k.anzahlMitarbeiter ?? ""} className={feld} />
        </Zeile>
        <Zeile label="Handelsregister-Nr.">
          <input name="handelsregisterNr" defaultValue={k.handelsregisterNr} className={feld} />
        </Zeile>
        <Zeile label="MWST-Nr.">
          <input name="mwstNr" defaultValue={k.mwstNr} className={feld} />
        </Zeile>
        <Zeile label="UID">
          <input name="uid" defaultValue={k.uid} placeholder="CHE-123.456.789" className={feld} />
        </Zeile>
      </Abschnitt>
    </div>
  );
}
