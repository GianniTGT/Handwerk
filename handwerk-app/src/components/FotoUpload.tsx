"use client";

import { useRef, useState } from "react";

// Foto-upload nga tereni: zvogëlon foton NË TELEFON (canvas, max 1600px,
// JPEG 0.8) para dërgimit — upload i shpejtë edhe me rrjet të dobët mobil.
export default function FotoUpload({
  auftragId,
  onSave,
}: {
  auftragId: string;
  onSave: (auftragId: string, dataUrl: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  async function verkleinern(datei: File): Promise<string> {
    const bitmap = await createImageBitmap(datei);
    const maxSeite = 1600;
    const faktor = Math.min(1, maxSeite / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * faktor);
    canvas.height = Math.round(bitmap.height * faktor);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  async function gewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const dateien = Array.from(e.target.files ?? []);
    if (!dateien.length) return;
    setLaedt(true);
    setFehler("");
    try {
      for (const datei of dateien.slice(0, 5)) {
        if (!datei.type.startsWith("image/")) continue;
        const dataUrl = await verkleinern(datei);
        await onSave(auftragId, dataUrl);
      }
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setLaedt(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={gewaehlt}
        className="hidden"
        id={`foto-input-${auftragId}`}
      />
      <label
        htmlFor={`foto-input-${auftragId}`}
        className={`inline-block cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-white ${
          laedt ? "bg-muted" : "bg-forest hover:bg-forest-lift"
        }`}
      >
        {laedt ? "Lädt hoch…" : "📷 Foto aufnehmen / hochladen"}
      </label>
      {fehler && <p className="mt-1 text-xs text-red-600">{fehler}</p>}
      <p className="mt-1 text-xs text-muted">
        Wird automatisch verkleinert — schnell auch im Mobilnetz. Max. 20 Fotos.
      </p>
    </div>
  );
}
