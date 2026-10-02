// PDF për Mahnung (3 shkallë) dhe Gutschrift — përdor ndërtuesit e përbashkët nga pdf.ts
import { SwissQRBill } from "swissqrbill/pdf";
import { db } from "./db";
import { chf } from "./format";
import { faelligDatum } from "./faellig";
import { offenerBetrag } from "./mahnwesen";
import { dokumentStart, footerAufSeiten } from "./pdf";

type PdfErgebnis = { buffer: Buffer; dateiname: string; empfaengerEmail: string };

const MAHN_TEXTE: Record<number, { titel: string; text: string }> = {
  1: {
    titel: "Zahlungserinnerung",
    text: "Möglicherweise ist uns Ihre Zahlung zu unserer Rechnung entgangen oder sie hat sich mit diesem Schreiben gekreuzt. Wir bitten Sie, den offenen Betrag innert 10 Tagen zu überweisen.",
  },
  2: {
    titel: "1. Mahnung",
    text: "Trotz unserer Zahlungserinnerung konnten wir keinen Zahlungseingang feststellen. Wir bitten Sie, den offenen Betrag innert 7 Tagen zu überweisen.",
  },
  3: {
    titel: "2. Mahnung",
    text: "Leider ist auch auf unsere erste Mahnung keine Zahlung eingegangen. Bitte überweisen Sie den offenen Betrag innert 5 Tagen, ansonsten behalten wir uns weitere Schritte vor.",
  },
};

// Pismi i mahnimit për shkallën aktuale të faturës + QR-Rechnung me shumën e hapur
export async function mahnungPdf(id: string, betriebId: string): Promise<PdfErgebnis | null> {
  const rechnung = await db.rechnung.findFirst({
    where: { id, betriebId, mahnstufe: { gt: 0 } },
    include: { betrieb: true, gutschriften: true, auftrag: { include: { kunde: true } } },
  });
  if (!rechnung) return null;
  const { betrieb } = rechnung;
  const kunde = rechnung.auftrag.kunde;
  const info = MAHN_TEXTE[rechnung.mahnstufe] ?? MAHN_TEXTE[3];
  const offen = offenerBetrag(rechnung);
  const { doc, fertig, fTitel, fText } = dokumentStart(betrieb);

  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  doc
    .fillColor(fTitel)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(`${info.titel} — Rechnung RE-${rechnung.nummer}`, 50, 190);
  doc.fillColor(fText).fontSize(9).font("Helvetica").moveDown(0.8);
  const zeilen: [string, string][] = [
    ["Datum:", new Date().toLocaleDateString("de-CH")],
    ["Rechnung vom:", rechnung.datum.toLocaleDateString("de-CH")],
    ["Fällig seit:", faelligDatum(rechnung, betrieb.zahlungsfristTage).toLocaleDateString("de-CH")],
    ["Offener Betrag:", `CHF ${chf(offen)}`],
  ];
  for (const [label, wert] of zeilen) {
    const zy = doc.y;
    doc.font("Helvetica-Bold").text(label, 50, zy, { width: 100 });
    doc.font("Helvetica").text(wert, 155, zy, { width: 395 });
  }
  doc
    .moveDown(1.5)
    .text(`Guten Tag ${kunde.name}`, 50)
    .moveDown(0.5)
    .text(info.text, 50, doc.y, { width: 495 })
    .moveDown(1)
    .text(
      "Die QR-Rechnung für die Zahlung finden Sie auf der nächsten Seite. Falls Sie bereits bezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.",
      50,
      doc.y,
      { width: 495 }
    )
    .moveDown(1)
    .text("Freundliche Grüsse")
    .text(betrieb.name);

  const inhaltSeiten = footerAufSeiten(doc, betrieb, fText, `${info.titel} RE-${rechnung.nummer}`);
  doc.switchToPage(inhaltSeiten - 1);
  doc.addPage();
  new SwissQRBill({
    amount: offen,
    currency: "CHF",
    message: `${info.titel} Rechnung RE-${rechnung.nummer}`,
    creditor: {
      account: betrieb.iban.replace(/\s/g, ""),
      name: betrieb.name,
      address: betrieb.strasse,
      zip: betrieb.plz,
      city: betrieb.ort,
      country: "CH",
    },
    ...(kunde.strasse && kunde.plz && kunde.ort
      ? {
          debtor: {
            name: kunde.name,
            address: kunde.strasse,
            zip: kunde.plz,
            city: kunde.ort,
            country: "CH",
          },
        }
      : {}),
  }).attachTo(doc);
  doc.end();
  return {
    buffer: await fertig,
    dateiname: `${info.titel.replace(/[^A-Za-z0-9]+/g, "-")}-RE-${rechnung.nummer}.pdf`,
    empfaengerEmail: kunde.email,
  };
}

export async function gutschriftPdf(id: string, betriebId: string): Promise<PdfErgebnis | null> {
  const g = await db.gutschrift.findFirst({
    where: { id, betriebId },
    include: { betrieb: true, rechnung: { include: { auftrag: { include: { kunde: true } } } } },
  });
  if (!g) return null;
  const { betrieb } = g;
  const kunde = g.rechnung.auftrag.kunde;
  const { doc, fertig, fTitel, fText } = dokumentStart(betrieb);

  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`Gutschrift GS-${g.nummer}`, 50, 190);
  doc.fillColor(fText).fontSize(9).font("Helvetica").moveDown(0.8);
  const zeilen: [string, string][] = [
    ["Datum:", g.datum.toLocaleDateString("de-CH")],
    ["Zu Rechnung:", `RE-${g.rechnung.nummer} vom ${g.rechnung.datum.toLocaleDateString("de-CH")}`],
  ];
  if (g.grund) zeilen.push(["Grund:", g.grund]);
  for (const [label, wert] of zeilen) {
    const zy = doc.y;
    doc.font("Helvetica-Bold").text(label, 50, zy, { width: 100 });
    doc.font("Helvetica").text(wert, 155, zy, { width: 395 });
  }
  let y = doc.y + 25;
  const zeile = (label: string, wert: string, fett = false) => {
    doc.font(fett ? "Helvetica-Bold" : "Helvetica").text(label, 340, y, { width: 110, align: "right" });
    doc.text(wert, 470, y, { width: 80, align: "right" });
    y += 14;
  };
  zeile("Gutschrift netto", chf(g.totalNetto));
  zeile(`MwSt. ${g.mwstSatz}%`, chf(g.totalBrutto - g.totalNetto));
  zeile("Gutschrift brutto", `CHF ${chf(g.totalBrutto)}`, true);
  doc.text(
    "Der Betrag wird mit offenen Rechnungen verrechnet oder Ihnen zurückerstattet.",
    50,
    y + 20,
    { width: 495 }
  );
  doc.moveDown(1).text("Freundliche Grüsse").text(betrieb.name);

  footerAufSeiten(doc, betrieb, fText, `Gutschrift GS-${g.nummer}`);
  doc.end();
  return {
    buffer: await fertig,
    dateiname: `Gutschrift-GS-${g.nummer}.pdf`,
    empfaengerEmail: kunde.email,
  };
}
