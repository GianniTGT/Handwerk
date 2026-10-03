"use client";

import { useRef, useState } from "react";

// Firmenlogo wählen: wird im Browser auf max. 900×360 px verkleinert (PNG, Transparenz bleibt) und als
// verstecktes Feld mitgeschickt — kein Grössenlimit-Fehler mehr, Vorschau sofort sichtbar
export default function LogoUpload({ aktuell }: { aktuell: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [vorschau, setVorschau] = useState<string>(aktuell);
  const [daten, setDaten] = useState("");
  const [entfernen, setEntfernen] = useState(false);
  const [fehler, setFehler] = useState("");

  async function verkleinern(datei: File): Promise<string> {
    const bitmap = await createImageBitmap(datei);
    const faktor = Math.min(1, 900 / bitmap.width, 360 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * faktor));
    canvas.height = Math.max(1, Math.round(bitmap.height * faktor));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    // Fotos (JPEG) werden als PNG oft gross — dann lieber JPEG behalten
    return png.length > 400_000 ? canvas.toDataURL("image/jpeg", 0.85) : png;
  }

  async function gewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setFehler("");
    if (!["image/png", "image/jpeg"].includes(datei.type)) {
      setFehler("Nur PNG oder JPEG.");
      return;
    }
    try {
      const url = await verkleinern(datei);
      setDaten(url);
      setVorschau(url);
      setEntfernen(false);
    } catch {
      setFehler("Bild konnte nicht gelesen werden.");
    }
  }

  const zeige = entfernen ? "" : vorschau;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {zeige ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={zeige} alt="Logo" className="h-16 max-w-56 rounded border border-line bg-white object-contain p-1" />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-line text-xs text-muted">kein Logo</div>
      )}
      <div className="grid gap-1.5 text-sm">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={gewaehlt} className="hidden" />
        <input type="hidden" name="logoDataUrl" value={daten} />
        <input type="hidden" name="logoEntfernen" value={entfernen ? "1" : ""} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2">
            {zeige ? "Logo ändern" : "Logo wählen"}
          </button>
          {zeige && (
            <button type="button" onClick={() => { setEntfernen(true); setDaten(""); }} className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-red-600">
              Logo entfernen
            </button>
          )}
        </div>
        <span className="text-xs text-muted">
          PNG oder JPEG, wird automatisch verkleinert. {daten || entfernen ? <b className="text-amber-700">Noch nicht gespeichert — unten «Speichern» drücken.</b> : "Erscheint auf Offerten, Rechnungen und oben links."}
        </span>
        {fehler && <span className="text-xs text-red-700">{fehler}</span>}
      </div>
    </div>
  );
}
