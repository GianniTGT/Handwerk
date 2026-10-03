"use client";

import { useRef, useState } from "react";
import { Ik } from "@/components/Icons";
import type { SearchChTreffer } from "@/lib/searchch";
import type { WebseiteTreffer } from "@/lib/webseite";

// Formularfelder für Kontakt anlegen/bearbeiten — zweispaltig wie bei bexio:
// links Stammdaten und Kommunikation, rechts Zusatzinformationen und weitere Angaben
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
const knopf = "rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-surface2";

function Zeile({ label, children, voll }: { label: string; children: React.ReactNode; voll?: boolean }) {
  return (
    <label className={`grid gap-0.5 text-xs text-muted ${voll ? "col-span-full" : ""}`}>
      {label.trim().endsWith("*") ? (
        <>
          {label.trim().slice(0, -1).trim()} <span className="text-red-600">*</span>
        </>
      ) : (
        label
      )}
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

type WebFehler = "ungueltige-url" | "host-gesperrt" | "nicht-erreichbar" | "";
const webFehlerText: Record<string, string> = {
  "ungueltige-url": "Bitte eine gültige Adresse eingeben, z.B. www.firma.ch.",
  "host-gesperrt": "Diese Adresse kann nicht gelesen werden.",
  "nicht-erreichbar": "Die Webseite ist nicht erreichbar oder liefert keine lesbare Seite.",
};

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

  // Import-Dialog: Search.ch (Telefonbuch) oder Webseite der Firma
  const [dialog, setDialog] = useState<null | "searchch" | "web">(null);
  const [was, setWas] = useState("");
  const [wo, setWo] = useState("");
  const [webUrl, setWebUrl] = useState(k.website ?? "");
  const [laedt, setLaedt] = useState(false);
  const [treffer, setTreffer] = useState<SearchChTreffer[] | null>(null);
  const [web, setWeb] = useState<WebseiteTreffer | null>(null);
  const [fehlerText, setFehlerText] = useState("");

  const oeffne = (art: "searchch" | "web") => {
    setDialog(art);
    setTreffer(null);
    setWeb(null);
    setFehlerText("");
  };

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

  const leseWebseite = async () => {
    if (webUrl.trim().length < 4) return;
    setLaedt(true);
    setFehlerText("");
    setWeb(null);
    try {
      const r = await fetch(`/api/webseite?url=${encodeURIComponent(webUrl.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error((d.fehler as WebFehler) || "nicht-erreichbar");
      setWeb(d.treffer as WebseiteTreffer);
    } catch (e) {
      setFehlerText(webFehlerText[e instanceof Error ? e.message : ""] ?? webFehlerText["nicht-erreichbar"]);
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
    setDialog(null);
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

  const uebernehmenWeb = (t: WebseiteTreffer) => {
    setTyp("FIRMA");
    setDialog(null);
    setTimeout(() => {
      setzeWert("name", t.name);
      setzeWert("strasse", t.strasse);
      setzeWert("plz", t.plz);
      setzeWert("ort", t.ort);
      setzeWert("telefon", t.telefon);
      setzeWert("email", t.email);
      setzeWert("website", t.website);
      setzeWert("uid", t.uid);
      setzeWert("mwstNr", t.mwstNr);
    }, 60);
  };

  const webZeilen: [string, string][] = web
    ? [
        ["Firma", web.name],
        ["Strasse", web.strasse],
        ["PLZ / Ort", `${web.plz} ${web.ort}`.trim()],
        ["Telefon", web.telefon],
        ["E-Mail", web.email],
        ["Website", web.website],
        ["UID / MWST", web.uid],
      ]
    : [];
  const webGefunden = webZeilen.filter(([, w]) => w).length;

  return (
    <div ref={wurzel} className="grid items-start gap-4 lg:grid-cols-2">
      {/* Linke Spalte */}
      <div className="grid gap-4">
        <Abschnitt titel="Stammdaten">
          <div className="col-span-full flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => oeffne("web")} className={knopf}>
              <Ik name="globus" />Von Webseite übernehmen
            </button>
            <button type="button" onClick={() => oeffne("searchch")} className={knopf}>
              <Ik name="suche" />Von Search.ch übernehmen
            </button>
            <span className="text-xs text-muted">Adresse, Telefon, E-Mail und UID automatisch ausfüllen</span>
          </div>
          <Zeile label="Kontakt-Nr. *">
            <input name="kontaktNr" required inputMode="numeric" defaultValue={k.kontaktNr ?? ""} className={feld} />
          </Zeile>
          <Zeile label="Kontakttyp">
            <div className="flex gap-4 py-1.5 text-sm text-ink">
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
          <Zeile label="Strasse und Nr." voll>
            <input name="strasse" defaultValue={k.strasse} className={feld} />
          </Zeile>
          <Zeile label="Adresszusatz" voll>
            <input name="adresszusatz" defaultValue={k.adresszusatz} className={feld} />
          </Zeile>
          <div className="col-span-full grid grid-cols-[6rem_1fr] gap-3">
            <Zeile label="PLZ">
              <input name="plz" defaultValue={k.plz} inputMode="numeric" className={feld} />
            </Zeile>
            <Zeile label="Ort">
              <input name="ort" defaultValue={k.ort} className={feld} />
            </Zeile>
          </div>
          <Zeile label="Land" voll>
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
      </div>

      {/* Rechte Spalte */}
      <div className="grid gap-4">
        <Abschnitt titel="Zusatzinformationen">
          <Zeile label="Betreut von (unser Mitarbeiter)">
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
          <Zeile label="Bemerkungen" voll>
            <textarea name="bemerkung" rows={4} defaultValue={k.bemerkung} className={feld} />
          </Zeile>
        </Abschnitt>

        <Abschnitt titel="Weitere Kontaktinformationen">
          <Zeile label="Anzahl Mitarbeitende">
            <input name="anzahlMitarbeiter" inputMode="numeric" defaultValue={k.anzahlMitarbeiter ?? ""} className={feld} />
          </Zeile>
          <Zeile label="Handelsregister-Nr.">
            <input name="handelsregisterNr" defaultValue={k.handelsregisterNr} className={feld} />
          </Zeile>
          <Zeile label="UID">
            <input name="uid" defaultValue={k.uid} placeholder="CHE-123.456.789" className={feld} />
          </Zeile>
          <Zeile label="MWST-Nr.">
            <input name="mwstNr" defaultValue={k.mwstNr} placeholder="CHE-123.456.789 MWST" className={feld} />
          </Zeile>
        </Abschnitt>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16"
          onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}
          role="dialog"
          aria-modal="true"
          aria-label={dialog === "web" ? "Von Webseite übernehmen" : "Von Search.ch übernehmen"}
        >
          <div className="w-full max-w-xl rounded-tiff bg-white shadow-2xl">
            <h2 className="border-b border-line px-6 py-4 text-lg">{dialog === "web" ? "Von Webseite übernehmen" : "Von Search.ch übernehmen"}</h2>

            {dialog === "searchch" ? (
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
                          <span className="block text-xs text-muted">{[t.strasse, `${t.plz} ${t.ort}`.trim(), t.telefon].filter(Boolean).join(" · ")}</span>
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
                  <button type="button" onClick={() => setDialog(null)} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 p-6" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void leseWebseite())}>
                <label className="grid gap-1 text-sm font-semibold">
                  Webseite der Firma
                  <input autoFocus value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="www.firma.ch" className={`${feld} font-normal`} />
                  <span className="text-xs font-normal text-muted">
                    Wir lesen Startseite, Impressum und Kontaktseite und schlagen Firma, Adresse, Telefon, E-Mail und UID vor. Bitte vor dem Speichern prüfen.
                  </span>
                </label>
                {fehlerText && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{fehlerText}</p>}
                {web && webGefunden === 0 && (
                  <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">Auf dieser Webseite wurden keine Firmendaten gefunden. Versuchen Sie die Impressum-Adresse direkt.</p>
                )}
                {web && webGefunden > 0 && (
                  <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 rounded border border-line p-3 text-sm">
                    {webZeilen.map(([l, w]) => (
                      <div key={l} className="contents">
                        <dt className="text-muted">{l}</dt>
                        <dd className={w ? "" : "text-muted"}>{w || "— nicht gefunden"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="flex flex-wrap gap-3">
                  {web && webGefunden > 0 ? (
                    <button type="button" onClick={() => uebernehmenWeb(web)} className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
                      Übernehmen
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={webUrl.trim().length < 4 || laedt}
                      onClick={() => void leseWebseite()}
                      className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift disabled:bg-gray-200 disabled:text-gray-500"
                    >
                      {laedt ? "Liest Webseite …" : "Daten holen"}
                    </button>
                  )}
                  {web && (
                    <button type="button" disabled={laedt} onClick={() => void leseWebseite()} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
                      Erneut lesen
                    </button>
                  )}
                  <button type="button" onClick={() => setDialog(null)} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
