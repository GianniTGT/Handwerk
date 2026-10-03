"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Profilbild wählen: wird im Browser quadratisch zugeschnitten und auf 256 px verkleinert (kleine Datei, schneller Upload)
export default function ProfilFoto({
  mitarbeiterId,
  fotoV,
  initialen,
  speichern,
  loeschen,
}: {
  mitarbeiterId: string;
  fotoV: number;
  initialen: string;
  speichern: (dataUrl: string) => Promise<void>;
  loeschen: () => Promise<void>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  async function zuschneiden(datei: File): Promise<string> {
    const bitmap = await createImageBitmap(datei);
    const seite = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    canvas
      .getContext("2d")!
      .drawImage(bitmap, (bitmap.width - seite) / 2, (bitmap.height - seite) / 2, seite, seite, 0, 0, 256, 256);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function gewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    if (!datei) return;
    setFehler("");
    if (!datei.type.startsWith("image/")) {
      setFehler("Bitte ein Bild (JPEG oder PNG) wählen.");
      return;
    }
    setLaedt(true);
    try {
      const dataUrl = await zuschneiden(datei);
      setVorschau(dataUrl);
      await speichern(dataUrl);
      router.refresh();
    } catch {
      setFehler("Das Bild konnte nicht gespeichert werden.");
      setVorschau(null);
    } finally {
      setLaedt(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const bild = vorschau ?? (fotoV > 0 ? `/api/avatar/${mitarbeiterId}?v=${fotoV}` : null);

  return (
    <div className="flex items-center gap-4">
      {bild ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bild} alt="Profilbild" className="h-20 w-20 rounded-full border border-line object-cover" />
      ) : (
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-2xl font-bold text-forest">{initialen}</span>
      )}
      <div className="grid gap-1.5 text-sm">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={gewaehlt} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={laedt}
          className="w-fit rounded-md border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2 disabled:opacity-50"
        >
          {laedt ? "Speichert …" : bild ? "Foto ändern" : "Foto hochladen"}
        </button>
        {bild && !laedt && (
          <button
            type="button"
            onClick={() => {
              setVorschau(null);
              void loeschen();
            }}
            className="w-fit text-xs text-muted hover:text-red-600">
            Foto entfernen
          </button>
        )}
        <span className="text-xs text-muted">JPEG oder PNG. Wird quadratisch zugeschnitten und erscheint oben rechts im Menü.</span>
        {fehler && <span className="text-xs text-red-700">{fehler}</span>}
      </div>
    </div>
  );
}
