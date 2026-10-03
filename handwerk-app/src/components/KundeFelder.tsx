"use client";

import { useRef, useState } from "react";
import type { SearchChTreffer } from "@/lib/searchch";

// Formularfelder für Kontakt anlegen/bearbeiten — gegliedert wie bei bexio
// (Stammdaten, Kommunikation, Zusatzinformationen, Weitere Kontaktinformationen)
export type KundeWerte = {
  kontaktNr?: number | null;
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
  const wurzel = useRef<HTMLDivElement>(null);

  // Import von Search.ch: Dialog mit Name/Firma + Ort, Treffer übernehmen die Adressdaten ins Formular
  const [dialog, setDialog] = useState(false);
  const [was, setWas] = useState("");
  const [wo, setWo] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [treffer, setTreffer] = useState<SearchChTreffer[] | null>(null);
  const [fehlerText, setFehlerText] = useState("");

  const suche = async () => {
    if (was.trim().length < 2) return;
    setLaedt(true);
    setFehlerText("");
    setTreffer(null);
    try {
      const r = await fetch(`/api/searchch?was=${encodeURIComponent(was.trim())}&wo=${encodeURIComponent(wo.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.fehler ?? "fehler");
      setTreffer(d.treffer as SearchChTreffer[]);
    } catch {
      setFehlerText("Search.ch ist gerade nicht erreichbar. Bitte später erneut versuchen oder von Hand erfassen.");
    } finally {
      setLaedt(false);
    }
  };

  const setzeWert = (name: string, wert: string) => {
    const el = wurzel.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!el || !wert) return;
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, wert);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const uebernehmen = (t: SearchChTreffer) => {
    setTyp(t.typ);
    setDialog(false);
    // Felder erscheinen erst nach dem Umschalten Firma/Privat — danach befüllen
    setTimeout(() => {
      if (t.typ === "PRIVAT") {
        setzeWert("vorname", t.vorname);
        setzeWert("nachname", t.nachname);
      } else {
        setzeWert("name", t.name);
        setzeWert("zusatz", t.zusatz);
      }
      setzeWert("strasse", t.strasse);
      setzeWert("plz", t.plz);
      setzeWert("ort", t.ort);
      setzeWert("telefon", t.telefon);
      setzeWert("email", t.email);
      setzeWert("website", t.website);
      setzeWert("branche", t.branche);
    }, 60);
  };

  return (
    <div ref={wurzel} className="grid gap-4">
      <Abschnitt titel="Stammdaten">
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={() => {
              setDialog(true);
              setTreffer(null);
              setFehlerText("");
            }}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-surface2"
          >
            🔍 Import von Search.ch
          </button>
          <span className="text-xs text-muted">Adresse und Telefon aus dem Schweizer Telefonbuch übernehmen</span>
        </div>
        <Zeile label="Kontakt-Nr. *">
          <input name="kontaktNr" required inputMode="numeric" defaultValue={k.kontaktNr ?? ""} className={feld} />
        </Zeile>
        <span className="hidden sm:block" />
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

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16"
          onMouseDown={(e) => e.target === e.currentTarget && setDialog(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Import von Search.ch"
        >
          <div className="w-full max-w-xl rounded-tiff bg-white shadow-2xl">
            <h2 className="border-b border-line px-6 py-4 text-lg">Import von Search.ch</h2>
            <div className="grid gap-4 p-6" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void suche())}>
              <label className="grid gap-1 text-sm font-semibold">
                Name / Firma
                <input autoFocus value={was} onChange={(e) => setWas(e.target.value)} className={`${feld} font-normal`} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Ort
                <input value={wo} onChange={(e) => setWo(e.target.value)} className={`${feld} font-normal`} />
              </label>

              {fehlerText && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{fehlerText}</p>}
              {treffer && treffer.length === 0 && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">Keine Treffer. Name oder Ort anpassen.</p>}
              {treffer && treffer.length > 0 && (
                <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded border border-line">
                  {treffer.map((t, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => uebernehmen(t)} className="block w-full px-3 py-2 text-left text-sm hover:bg-surface2">
                        <span className="font-semibold">{t.name}</span>
                        {t.zusatz && <span className="text-muted"> · {t.zusatz}</span>}
                        <span className="block text-xs text-muted">
                          {[t.strasse, `${t.plz} ${t.ort}`.trim(), t.telefon].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={was.trim().length < 2 || laedt}
                  onClick={() => void suche()}
                  className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {laedt ? "Suche …" : "Suchen"}
                </button>
                <button type="button" onClick={() => setDialog(false)} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
