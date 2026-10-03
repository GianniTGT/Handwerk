"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CHUNK, FELDER, MAX_ZEILEN, erkenneZuordnung, parseCsv, type ImportTyp } from "@/lib/import-felder";
import type { Duplikate, ImportErgebnis, ImportZeile } from "@/lib/actions-import";

// Datenübernahme in drei Schritten: Datei wählen → Spalten prüfen → importieren.
// Die Datei wird im Browser gelesen (auch Windows-Zeichensatz aus Excel), der Server erhält fertige Datensätze in Paketen.
export default function ImportAssistent({
  typ,
  importieren,
  zielHref,
  zielLabel,
}: {
  typ: ImportTyp;
  importieren: (zeilen: ImportZeile[], duplikate: Duplikate) => Promise<ImportErgebnis>;
  zielHref: string;
  zielLabel: string;
}) {
  const felder = FELDER[typ];
  const [dateiName, setDateiName] = useState("");
  const [kopf, setKopf] = useState<string[]>([]);
  const [zeilen, setZeilen] = useState<string[][]>([]);
  const [zuordnung, setZuordnung] = useState<Record<string, number>>({});
  const [duplikate, setDuplikate] = useState<Duplikate>("ueberspringen");
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState(0);
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null);
  const [fehler, setFehler] = useState("");

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setFehler("");
    setErgebnis(null);
    if (datei.size > 10 * 1024 * 1024) {
      setFehler("Datei grösser als 10 MB.");
      return;
    }
    if (/\.xlsx?$/i.test(datei.name)) {
      setFehler("Bitte als CSV speichern: in Excel «Datei → Speichern unter → CSV UTF-8 (durch Trennzeichen getrennt)». bexio bietet den CSV-Export direkt an.");
      return;
    }
    const puffer = await datei.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(puffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(puffer); // Excel ohne UTF-8
    }
    const { kopf: k, zeilen: z } = parseCsv(text);
    if (k.length < 2 || z.length === 0) {
      setFehler("Keine Tabelle erkannt. Die erste Zeile muss die Spaltennamen enthalten.");
      return;
    }
    if (z.length > MAX_ZEILEN) {
      setFehler(`Max. ${MAX_ZEILEN.toLocaleString("de-CH")} Zeilen pro Datei — bitte aufteilen.`);
      return;
    }
    setDateiName(datei.name);
    setKopf(k);
    setZeilen(z);
    setZuordnung(erkenneZuordnung(k, typ));
  }

  const pflichtFehlt = felder.filter((f) => f.pflicht && zuordnung[f.key] === undefined);
  const zugeordnet = felder.filter((f) => zuordnung[f.key] !== undefined).length;
  const nichtVerwendet = useMemo(() => kopf.map((k, i) => ({ k, i })).filter(({ i }) => !Object.values(zuordnung).includes(i)), [kopf, zuordnung]);

  const datensaetze = (): ImportZeile[] =>
    zeilen.map((z) => Object.fromEntries(felder.filter((f) => zuordnung[f.key] !== undefined).map((f) => [f.key, z[zuordnung[f.key]] ?? ""])));

  async function starten() {
    setLaeuft(true);
    setFehler("");
    setFortschritt(0);
    const alle = datensaetze();
    const summe: ImportErgebnis = { neu: 0, aktualisiert: 0, uebersprungen: 0, fehler: [] };
    try {
      for (let i = 0; i < alle.length; i += CHUNK) {
        const r = await importieren(alle.slice(i, i + CHUNK), duplikate);
        summe.neu += r.neu;
        summe.aktualisiert += r.aktualisiert;
        summe.uebersprungen += r.uebersprungen;
        summe.fehler.push(...r.fehler.map((f) => f.replace(/^Zeile (\d+)/, (_, n) => `Zeile ${Number(n) + i + 1}`)));
        setFortschritt(Math.min(alle.length, i + CHUNK));
      }
      setErgebnis(summe);
    } catch {
      setFehler("Der Import wurde unterbrochen. Bereits importierte Zeilen bleiben erhalten — Datei erneut hochladen, Duplikate werden übersprungen.");
    } finally {
      setLaeuft(false);
    }
  }

  const feld = "w-full rounded border border-line bg-white p-1.5 text-sm";
  const karte = "rounded-tiff border border-line bg-white p-4 shadow-sm";

  if (ergebnis) {
    return (
      <div className={karte}>
        <h2 className="font-semibold">Import abgeschlossen</h2>
        <dl className="mt-3 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          <dt>Neu angelegt</dt>
          <dd className="text-right font-semibold tabular-nums">{ergebnis.neu}</dd>
          <dt>Aktualisiert</dt>
          <dd className="text-right tabular-nums">{ergebnis.aktualisiert}</dd>
          <dt>Übersprungen (Duplikate / leer)</dt>
          <dd className="text-right tabular-nums">{ergebnis.uebersprungen}</dd>
        </dl>
        {ergebnis.fehler.length > 0 && (
          <details className="mt-3 text-xs text-muted">
            <summary className="cursor-pointer">{ergebnis.fehler.length} Hinweise</summary>
            <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto">
              {ergebnis.fehler.slice(0, 200).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="mt-4 flex gap-2">
          <Link href={zielHref} className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
            Zu {zielLabel}
          </Link>
          <button type="button" onClick={() => { setErgebnis(null); setKopf([]); setZeilen([]); setDateiName(""); }} className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">
            Weitere Datei importieren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className={karte}>
        <h2 className="font-semibold">1. Datei wählen</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
            CSV-Datei wählen
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={dateiGewaehlt} className="hidden" />
          </label>
          {dateiName && (
            <span className="text-sm text-muted">
              {dateiName} · {zeilen.length.toLocaleString("de-CH")} Zeilen · {kopf.length} Spalten
            </span>
          )}
        </div>
        {fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehler}</p>}
      </section>

      {kopf.length > 0 && (
        <>
          <section className={karte}>
            <h2 className="font-semibold">2. Spalten prüfen</h2>
            <p className="mt-1 text-xs text-muted">
              {zugeordnet} von {felder.length} Feldern automatisch erkannt. Links unser Feld, rechts die Spalte aus Ihrer Datei — bei Bedarf anpassen. Daneben steht
              der Wert der ersten Zeile zur Kontrolle.
            </p>
            {pflichtFehlt.length > 0 && (
              <p className="mt-2 rounded bg-amber-100 p-2 text-sm text-amber-900">Pflichtfeld fehlt: {pflichtFehlt.map((f) => f.label).join(", ")} — bitte eine Spalte zuordnen.</p>
            )}
            <div className="mt-3 grid gap-x-6 gap-y-2 lg:grid-cols-2">
              {felder.map((f) => {
                const idx = zuordnung[f.key];
                return (
                  <div key={f.key} className="grid grid-cols-[11rem_1fr_1fr] items-center gap-2 text-sm">
                    <span className={f.pflicht && idx === undefined ? "font-medium text-amber-800" : ""}>
                      {f.label}
                      {f.pflicht && " *"}
                      {f.hinweis && <span className="block text-[11px] font-normal text-muted">{f.hinweis}</span>}
                    </span>
                    <select
                      value={idx ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setZuordnung((z) => {
                          const n = { ...z };
                          if (v === "") delete n[f.key];
                          else n[f.key] = Number(v);
                          return n;
                        });
                      }}
                      className={feld}
                    >
                      <option value="">— nicht importieren —</option>
                      {kopf.map((k, i) => (
                        <option key={i} value={i}>
                          {k || `Spalte ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="truncate text-xs text-muted" title={idx !== undefined ? zeilen[0]?.[idx] : ""}>
                      {idx !== undefined ? zeilen[0]?.[idx] || "—" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            {nichtVerwendet.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Nicht übernommen: {nichtVerwendet.map(({ k }) => k || "(ohne Namen)").join(", ")}
              </p>
            )}
          </section>

          <section className={karte}>
            <h2 className="font-semibold">3. Vorschau</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface2 text-left uppercase text-muted">
                  <tr>
                    {felder.filter((f) => zuordnung[f.key] !== undefined).map((f) => (
                      <th key={f.key} className="whitespace-nowrap p-1.5">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {zeilen.slice(0, 5).map((z, i) => (
                    <tr key={i}>
                      {felder.filter((f) => zuordnung[f.key] !== undefined).map((f) => (
                        <td key={f.key} className="max-w-[14rem] truncate p-1.5" title={z[zuordnung[f.key]]}>
                          {z[zuordnung[f.key]]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-muted">Erste 5 von {zeilen.length.toLocaleString("de-CH")} Zeilen.</p>
          </section>

          <section className={`${karte} sticky bottom-0 z-10 bg-paper/95 backdrop-blur`}>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                Bereits vorhandene {typ === "kontakte" ? "Kontakte" : "Produkte"}:
                <select value={duplikate} onChange={(e) => setDuplikate(e.target.value as Duplikate)} className="rounded border border-line bg-white p-1.5 text-sm">
                  <option value="ueberspringen">überspringen</option>
                  <option value="aktualisieren">mit Datei aktualisieren</option>
                </select>
              </label>
              <button
                type="button"
                disabled={laeuft || pflichtFehlt.length > 0}
                onClick={() => void starten()}
                className="rounded-md bg-forest px-6 py-2 text-sm font-semibold text-white hover:bg-forest-lift disabled:opacity-40"
              >
                {laeuft ? `Importiert … ${fortschritt.toLocaleString("de-CH")} / ${zeilen.length.toLocaleString("de-CH")}` : `${zeilen.length.toLocaleString("de-CH")} Zeilen importieren`}
              </button>
              <span className="text-xs text-muted">
                Erkannt über {typ === "kontakte" ? "Kontakt-Nr. oder Name + PLZ" : "Art-Nr. oder Bezeichnung"}.
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
