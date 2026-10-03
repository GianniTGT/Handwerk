export const dynamic = "force-dynamic";

import Link from "next/link";
import { sitzungErforderlich } from "@/lib/auth";
import { darf } from "@/lib/rechte";
import { importiereArtikel, importiereKontakte } from "@/lib/actions-import";
import ImportAssistent from "@/components/ImportAssistent";
import { ListenKopf } from "@/components/Liste";

// Datenübernahme von bexio (oder Excel, anderen Programmen): Kontakte und Produkte per CSV
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const { mitarbeiter } = await sitzungErforderlich();
  const sp = await searchParams;
  const darfKontakte = darf(mitarbeiter, "KONTAKTE");
  const darfProdukte = darf(mitarbeiter, "PRODUKTE");
  const typ = sp.typ === "artikel" && darfProdukte ? "artikel" : darfKontakte ? "kontakte" : darfProdukte ? "artikel" : null;

  const reiter = [
    darfKontakte && { key: "kontakte", label: "Kontakte" },
    darfProdukte && { key: "artikel", label: "Produkte" },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div>
      <ListenKopf
        titel="Datenübernahme"
        untertitel="Kontakte und Produkte aus bexio, Excel oder einem anderen Programm übernehmen. Die Spalten werden automatisch erkannt und können vor dem Import geprüft werden."
      />
      <div className="mt-3 flex flex-wrap gap-1 text-sm">
        {reiter.map((r) => (
          <Link
            key={r.key}
            href={`/import?typ=${r.key}`}
            className={`rounded-full border px-3 py-1 ${typ === r.key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {typ === null ? (
        <p className="mt-4 text-sm text-muted">Für die Datenübernahme braucht es das Recht «Kontakte» oder «Produkte».</p>
      ) : (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_20rem]">
          <ImportAssistent
            key={typ}
            typ={typ}
            importieren={typ === "kontakte" ? importiereKontakte : importiereArtikel}
            zielHref={typ === "kontakte" ? "/kunden" : "/artikel"}
            zielLabel={typ === "kontakte" ? "den Kontakten" : "den Produkten"}
          />
          <aside className="rounded-tiff border border-line bg-white p-4 text-sm shadow-sm xl:order-first xl:row-span-2">
            <h2 className="font-semibold">So exportieren Sie aus bexio</h2>
            {typ === "kontakte" ? (
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-muted">
                <li>In bexio <b>Kontakte</b> öffnen.</li>
                <li>Oben links alle Kontakte anhaken (Kästchen in der Kopfzeile).</li>
                <li><b>Exportieren → CSV</b> wählen und die Datei speichern.</li>
                <li>Datei hier hochladen. Spalten wie «Name 1», «Name 2», «Kontaktart», «Telefon Fix» werden erkannt.</li>
              </ol>
            ) : (
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-muted">
                <li>In bexio <b>Produkte</b> öffnen.</li>
                <li>Alle Produkte anhaken und <b>Exportieren → CSV</b> wählen.</li>
                <li>Datei hier hochladen. Art-Nr., Bezeichnung, Einheit, Einkaufs- und Verkaufspreis werden erkannt.</li>
              </ol>
            )}
            <h3 className="mt-4 font-semibold">Aus Excel</h3>
            <p className="mt-1 text-muted">
              Tabelle mit einer Kopfzeile als <b>CSV UTF-8</b> speichern (Datei → Speichern unter). Deutsche Spaltennamen genügen, der Rest wird hier zugeordnet.
            </p>
            <h3 className="mt-4 font-semibold">Gut zu wissen</h3>
            <ul className="mt-1 list-inside list-disc space-y-1 text-muted">
              <li>Mehrfaches Hochladen ist unproblematisch: Vorhandenes wird erkannt und übersprungen oder auf Wunsch aktualisiert.</li>
              <li>Kontakt-Nummern aus bexio bleiben erhalten, sofern frei.</li>
              <li>Offerten und Rechnungen aus bexio behalten Sie als PDF-Archiv; offene Posten erfassen Sie neu.</li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
