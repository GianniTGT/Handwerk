export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";
import { TIFF } from "@/lib/tiff";
import DruckenKnopf from "@/components/DruckenKnopf";

type Schritt = { titel: string; punkte: React.ReactNode[] };

const monteur: Schritt[] = [
  {
    titel: "Einmal einrichten",
    punkte: [
      "App im Browser öffnen und anmelden (E-Mail + Passwort). Beim ersten Mal das Passwort ändern.",
      "«Zum Startbildschirm hinzufügen» (Chrome: Menü ⋮ → App installieren; iPhone: Teilen → Zum Home-Bildschirm). Danach öffnet sich Handwerk wie eine App.",
    ],
  },
  {
    titel: "Ein Auftrag vor Ort",
    punkte: [
      <><b>Verkauf → Aufträge</b> → Auftrag antippen.</>,
      <><b>Position erfassen:</b> Typ wählen (Arbeit oder Material). Material aus der Artikelliste wählen (Preis kommt automatisch) oder frei eintippen. Menge angeben → «Hinzufügen».</>,
      <><b>Fotos:</b> «Foto aufnehmen / hochladen» (vorher/nachher, defektes Teil). Die Fotos werden automatisch verkleinert.</>,
      <><b>Unterschrift:</b> Kunde unterschreibt auf dem Bildschirm → <b>«Unterschrift speichern &amp; Auftrag abschliessen»</b>. Der Auftrag geht damit ans Büro zum Verrechnen.</>,
    ],
  },
  {
    titel: "Arbeitszeit erfassen",
    punkte: [
      <><b>Projekte → Zeiterfassung</b>, Auftrag wählen, <b>▶ Stoppuhr</b> starten und am Ende <b>■ Stopp</b> drücken. Oder die Dauer von Hand eingeben (z. B. <code>1:30</code>). Speichern.</>,
    ],
  },
  {
    titel: "Kein Netz (Keller, Baustelle)?",
    punkte: [
      "Bereits geöffnete Seiten bleiben lesbar. Fotos und Unterschriften werden zwischengespeichert und automatisch gesendet, sobald wieder Netz da ist (ein Hinweis erscheint am Bildschirmrand).",
    ],
  },
  {
    titel: "Gut zu wissen",
    punkte: [
      "Monteure sehen keine Rechnungen, Offertenpreise oder Einstellungen.",
      "Nach der Rechnungsstellung lässt sich ein Auftrag nicht mehr ändern. Fehler? Büro informieren.",
      <>Aufgaben für Sie stehen im Dashboard unter <b>«Meine Aufgaben»</b>.</>,
    ],
  },
];

const buero: Schritt[] = [
  {
    titel: "Kunde und Anlage",
    punkte: [
      <><b>Kontakte → ＋ Neuer Kontakt:</b> Firma oder Privatperson, Adresse, E-Mail/Telefon, interner Ansprechpartner. Danach im Kontakt <b>Kontaktpersonen</b> (z. B. Hauswart) und <b>Objekte/Anlagen</b> (z. B. «Heizung Keller — Viessmann») erfassen.</>,
    ],
  },
  {
    titel: "Offerte → Auftrag",
    punkte: [
      <><b>Verkauf → Offerten → Neue Offerte:</b> Kunde, Titel. Positionen in Gruppen erfassen (Artikel aus der Liste oder frei).</>,
      <><b>PDF</b> ansehen oder per <b>E-Mail senden</b>. Wird sie angenommen: Status «Angenommen» → <b>In Auftrag umwandeln</b>.</>,
    ],
  },
  {
    titel: "Auftrag → Rechnung",
    punkte: [
      <><b>Aufträge:</b> Rapport des Monteurs prüfen. Gebuchte Zeiten übernehmen («In Rapport übernehmen»). Optional einen <b>Lieferschein</b> erstellen.</>,
      <><b>Rechnung erstellen.</b> Bei Anzahlung zuerst <b>Teilrechnung (Akonto)</b>; die <b>Schlussrechnung</b> zieht das Akonto automatisch ab.</>,
      <>Unter <b>Rechnungen:</b> <b>PDF mit QR</b> prüfen → «Als versendet markieren» oder per E-Mail senden. Die QR-Rechnung liegt auf der letzten Seite.</>,
      <>Korrektur im Nachhinein: <b>Gutschrift</b> zur Rechnung erstellen.</>,
    ],
  },
  {
    titel: "Zahlungen und Mahnungen",
    punkte: [
      <><b>Banking → Zahlung erfassen</b> (oder CSV der Bank importieren): Passt der Betrag zu einer offenen Rechnung, wird sie automatisch «bezahlt».</>,
      <><b>Verkauf → Mahnwesen → Mahnlauf starten:</b> erstellt Zahlungserinnerung bzw. Mahnungen (Fristen in den Einstellungen) und sendet sie per E-Mail, wenn der Kunde eine Adresse hat.</>,
    ],
  },
  {
    titel: "Wartung",
    punkte: [
      <><b>Projekte → Wartungsverträge:</b> pro Anlage Intervall und Preis. Ein Klick erstellt den Service-Auftrag.</>,
      <><b>Verkauf → Wiederkehrende Rechnungen → Rechnungslauf:</b> verrechnet Pauschalen automatisch als Rechnungsentwurf.</>,
    ],
  },
  {
    titel: "Einkauf",
    punkte: [
      <><b>Einkauf → Bestellungen:</b> Material beim Lieferanten bestellen (PDF).</>,
      <><b>Einkauf → Ausgaben → ＋ Neue Ausgabe:</b> Lieferantenrechnungen und Betriebskosten erfassen und als bezahlt markieren.</>,
      <><b>Einkauf → Posteingang → Beleg hochladen:</b> PDF/Foto der Lieferantenrechnung hochladen → «Als Ausgabe erfassen».</>,
    ],
  },
  {
    titel: "Übersicht und Auswertung",
    punkte: [
      <><b>Dashboard:</b> Kennzahlen, Aufgaben, Liquidität, offene Rechnungen. Mit <b>«Dashboard bearbeiten»</b> Widgets verschieben oder ausblenden.</>,
      <><b>Verkauf → Analyse:</b> Umsatz pro Monat, Top-Kunden, Offertenquote. <b>Mehr → Export:</b> Listen als CSV für Excel oder den Treuhänder.</>,
    ],
  },
  {
    titel: "Einrichten (Chef/Büro)",
    punkte: [
      <><b>Einstellungen:</b> Firmenname, <b>IBAN</b> (ohne IBAN keine QR-Rechnung!), Logo, Zahlungsfrist, Mahnfristen, Nummernkreise, Mailvorlagen, Kopf-/Fusstexte, Stundensätze.</>,
      <><b>Benutzer &amp; Rechte</b> (nur Chef): Mitarbeiter anlegen, Rolle und Rechte festlegen.</>,
      <><b>Mein Profil</b> (Name oben rechts): Passwort ändern. Vergessen? Auf der Anmeldeseite «Passwort vergessen?».</>,
    ],
  },
];

function Abschnitt({ titel, daten }: { titel: string; daten: Schritt[] }) {
  return (
    <section className="break-inside-avoid-page rounded-tiff border border-line bg-white p-5 shadow-sm print:shadow-none">
      <h2 className="text-lg font-bold text-forest">{titel}</h2>
      <div className="mt-3 grid gap-4">
        {daten.map((s) => (
          <div key={s.titel} className="break-inside-avoid">
            <h3 className="text-sm font-semibold">{s.titel}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
              {s.punkte.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function HilfePage() {
  await sitzungErforderlich();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kurzanleitung</h1>
          <p className="mt-1 text-sm text-muted">Handwerk by TIFF — für Monteure und Büro. Zum Ausdrucken geeignet.</p>
        </div>
        <DruckenKnopf />
      </div>

      <div className="mt-5 grid gap-5">
        <Abschnitt titel="🔧 Für Monteure (am Handy)" daten={monteur} />
        <Abschnitt titel="🗂 Für das Büro" daten={buero} />
        <section className="rounded-tiff border border-line bg-white p-5 text-sm shadow-sm print:shadow-none">
          <h2 className="text-lg font-bold text-forest">Hilfe</h2>
          <p className="mt-2">
            Support von {TIFF.name}:{" "}
            <a href={`mailto:${TIFF.supportEmail}`} className="font-medium text-forest underline">{TIFF.supportEmail}</a> ·{" "}
            <a href={`tel:${TIFF.supportTelefon.replace(/\s/g, "")}`} className="font-medium text-forest underline">{TIFF.supportTelefon}</a>
          </p>
          <p className="mt-2 text-muted">
            Bei einem Fehler bitte notieren: Seite, was Sie gemacht haben, Uhrzeit — und wenn möglich einen Screenshot.
          </p>
        </section>
      </div>
    </div>
  );
}
