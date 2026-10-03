export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";
import { uploadBeleg } from "@/lib/actions-buero";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

const fehlerTexte: Record<string, string> = {
  datei: "Bitte eine Datei auswählen.",
  gross: "Datei zu gross — max. 3 MB.",
  format: "Nur PDF, JPEG oder PNG.",
};

export default async function BelegHochladen({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  await sitzungErforderlich();
  const sp = await searchParams;
  return (
    <FormularSeite
      zurueckHref="/posteingang"
      zurueckLabel="Posteingang"
      titel="Beleg hochladen"
      untertitel="PDF oder Foto einer Lieferantenrechnung, max. 3 MB. Danach lässt sich der Beleg als Ausgabe verbuchen."
    >
      {sp.fehler && <Hinweis art="fehler">{fehlerTexte[sp.fehler] ?? "Upload fehlgeschlagen."}</Hinweis>}
      <form action={uploadBeleg} className={`mt-3 ${KARTE}`}>
        <Feld label="Datei * (PDF, JPEG, PNG)" voll>
          <input name="datei" type="file" required accept="application/pdf,image/jpeg,image/png" className={FELD} />
        </Feld>
        <Feld label="Titel (leer = Dateiname)" voll>
          <input name="titel" placeholder="z.B. Rechnung Debrunner Oktober" className={FELD} />
        </Feld>
        <FormularFuss speichern="Hochladen" abbrechenHref="/posteingang" />
      </form>
    </FormularSeite>
  );
}
