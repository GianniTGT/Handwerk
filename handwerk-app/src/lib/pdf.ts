// Gjeneratorët e PDF-ve — të përdorshëm nga API-routes DHE nga email-dërgimi.
import { rechnungNr, dateiTeil } from "./nrtext";
import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import { db } from "./db";
import { chf, offerteNummer, runde5Rappen } from "./format";
import { faelligDatum } from "./faellig";

function logoBuffer(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  return m ? Buffer.from(m[2], "base64") : null;
}

type BetriebDesign = {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;
  telefon: string;
  bank: string;
  bic: string;
  iban: string;
  mwstNr: string;
  logo: string;
  farbeTitel: string;
  farbeLinien: string;
  farbeText: string;
};

export function dokumentStart(betrieb: BetriebDesign) {
  const fTitel = betrieb.farbeTitel || "#1C1C1E";
  const fLinie = betrieb.farbeLinien || "#9AA5A0";
  const fText = betrieb.farbeText || "#1C1C1E";
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fertig = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );
  doc.page.margins.bottom = 90;

  const logo = betrieb.logo ? logoBuffer(betrieb.logo) : null;
  if (logo) {
    try {
      doc.image(logo, 50, 42, { fit: [150, 55] });
    } catch {
      /* logo e palexueshme — vazhdo pa të */
    }
  }
  doc.fillColor(fTitel).fontSize(12).font("Helvetica-Bold").text(betrieb.name, 50, logo ? 105 : 50);
  doc
    .fillColor(fText)
    .fontSize(9)
    .font("Helvetica")
    .text(`${betrieb.strasse} · ${betrieb.plz} ${betrieb.ort}`);

  return { doc, fertig, fTitel, fLinie, fText };
}

export function footerAufSeiten(
  doc: InstanceType<typeof PDFDocument>,
  betrieb: BetriebDesign,
  fText: string,
  dokumentLabel: string,
  nurErsteN?: number
) {
  const seiten = nurErsteN ?? doc.bufferedPageRange().count;
  for (let i = 0; i < seiten; i++) {
    doc.switchToPage(i);
    const alteMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const fy = doc.page.height - 65;
    doc.fontSize(7).font("Helvetica").fillColor(fText);
    const zeile1 = [
      `${betrieb.name} · ${betrieb.strasse}, ${betrieb.plz} ${betrieb.ort}`,
      betrieb.email && `E-Mail: ${betrieb.email}`,
      betrieb.telefon && `Telefon: ${betrieb.telefon}`,
    ]
      .filter(Boolean)
      .join("   ");
    const zeile2 = [
      betrieb.bank && `Bank: ${betrieb.bank}`,
      betrieb.bic && `BIC: ${betrieb.bic}`,
      betrieb.iban && `IBAN: ${betrieb.iban}`,
      betrieb.mwstNr && `MWST-Nr.: ${betrieb.mwstNr}`,
    ]
      .filter(Boolean)
      .join("   ");
    doc.text(zeile1, 50, fy, { width: 495, align: "center" });
    if (zeile2) doc.text(zeile2, 50, fy + 10, { width: 495, align: "center" });
    doc.text(`${dokumentLabel} · Seite ${i + 1} von ${seiten}`, 50, fy + 20, {
      width: 495,
      align: "center",
    });
    doc.page.margins.bottom = alteMargin;
  }
  return seiten;
}

export async function rechnungPdf(
  id: string,
  betriebId: string
): Promise<{ buffer: Buffer; dateiname: string; empfaengerEmail: string } | null> {
  const rechnung = await db.rechnung.findFirst({
    where: { id, betriebId },
    include: {
      betrieb: true,
      auftrag: {
        include: { kunde: true, objekt: true, rapporte: { include: { positionen: true } } },
      },
    },
  });
  if (!rechnung) return null;

  const { betrieb, auftrag } = rechnung;
  const kunde = auftrag.kunde;
  // Teilrechnung = një rresht pauschal; Schlussrechnung = pozicionet e rapporteve (− Akonto)
  const positionen =
    rechnung.art === "TEIL"
      ? [{ bezeichnung: rechnung.bezeichnung || "Akonto", menge: 1, einheit: "pauschal", ansatz: rechnung.totalNetto }]
      : auftrag.rapporte.flatMap((r) => r.positionen);
  const { doc, fertig, fTitel, fLinie, fText } = dokumentStart(betrieb);

  // Empfänger djathtas
  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  // Titel + blloku informativ
  const zahlbarBis = faelligDatum(rechnung, betrieb.zahlungsfristTage);
  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`${rechnung.art === "TEIL" ? "Teilrechnung" : "Rechnung"} ${rechnungNr(rechnung)}`, 50, 190);
  doc.fontSize(11).text(auftrag.titel, 50).moveDown(0.5);
  doc.fillColor(fText).fontSize(9);
  const info: [string, string][] = [
    ["Datum:", rechnung.datum.toLocaleDateString("de-CH")],
    ["Zahlbar bis:", zahlbarBis.toLocaleDateString("de-CH")],
    ["Auftrag:", `#${auftrag.nummer}`],
  ];
  if (auftrag.objekt)
    info.push([
      "Objekt:",
      `${auftrag.objekt.bezeichnung}${auftrag.objekt.ort ? `, ${auftrag.objekt.strasse}, ${auftrag.objekt.plz} ${auftrag.objekt.ort}` : ""}`,
    ]);
  if (betrieb.mwstNr) info.push(["MwSt. Nr.:", betrieb.mwstNr]);
  for (const [label, wert] of info) {
    const zeileY = doc.y;
    doc.font("Helvetica-Bold").text(label, 50, zeileY, { width: 80 });
    doc.font("Helvetica").text(wert, 135, zeileY, { width: 415 });
  }

  doc.moveDown(1.5);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Guten Tag ${kunde.name}`, 50)
    .moveDown(0.5)
    .text(betrieb.rechnungKopftext.trim() || "Danke für Ihr Vertrauen. Ihre Rechnung setzt sich wie folgt zusammen:");

  const xPos = 50, xBez = 75, xMenge = 320, xEinheit = 370, xAnsatz = 420, xTotal = 490;
  let y = doc.y + 15;
  doc.fillColor(fTitel).font("Helvetica-Bold").fontSize(9);
  doc.text("Pos.", xPos, y);
  doc.text("Beschreibung", xBez, y);
  doc.text("Menge", xMenge, y, { width: 40, align: "right" });
  doc.text("Einheit", xEinheit, y);
  doc.text("Ansatz", xAnsatz, y, { width: 60, align: "right" });
  doc.text("Preis in CHF", xTotal, y, { width: 60, align: "right" });
  y += 14;
  doc.moveTo(xPos, y).lineTo(550, y).strokeColor(fLinie).stroke();
  y += 6;

  doc.fillColor(fText).font("Helvetica").fontSize(9);
  positionen.forEach((p, i) => {
    const hoehe = Math.max(14, doc.heightOfString(p.bezeichnung, { width: 235 }) + 2);
    if (y + hoehe > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.text(String(i + 1), xPos, y);
    doc.text(p.bezeichnung, xBez, y, { width: 235 });
    doc.text(String(p.menge), xMenge, y, { width: 40, align: "right" });
    doc.text(p.einheit, xEinheit, y);
    doc.text(chf(p.ansatz), xAnsatz, y, { width: 60, align: "right" });
    doc.text(chf(p.menge * p.ansatz), xTotal, y, { width: 60, align: "right" });
    y += hoehe;
  });

  y += 4;
  doc.moveTo(xPos, y).lineTo(550, y).strokeColor(fLinie).stroke();
  y += 8;

  const bruttoExakt = rechnung.totalNetto * (1 + rechnung.mwstSatz / 100);
  const mwstBetrag = bruttoExakt - rechnung.totalNetto;
  const rundung = rechnung.totalBrutto - bruttoExakt;
  const zeile = (label: string, wert: string, fett = false) => {
    doc.font(fett ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, xEinheit - 50, y, { width: 110, align: "right" });
    doc.text(wert, xTotal, y, { width: 60, align: "right" });
    y += 13;
  };
  if (rechnung.abzugNetto > 0) {
    zeile("Total Leistungen", chf(rechnung.totalNetto + rechnung.abzugNetto));
    zeile("Abzgl. Akonto-Rechnungen", `-${chf(rechnung.abzugNetto)}`);
  }
  zeile("Total netto", chf(rechnung.totalNetto));
  zeile(`Zzgl. MwSt. ${rechnung.mwstSatz}%`, chf(mwstBetrag));
  if (Math.abs(rundung) >= 0.005) zeile("Rundungsdifferenz", chf(rundung));
  zeile("Betrag inkl. MwSt.", chf(rechnung.totalBrutto), true);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(betrieb.rechnungFusstext.trim() || "Sie haben Fragen? Melden Sie sich bei uns.", 50, y + 25, { width: 495 })
    .moveDown(1)
    .text("Freundliche Grüsse")
    .text(betrieb.name)
    .moveDown(1)
    .fontSize(8)
    .text("Ihre QR-Rechnung befindet sich auf der nächsten Seite.");

  const inhaltSeiten = footerAufSeiten(doc, betrieb, fText, `Rechnung ${rechnungNr(rechnung)}`);

  // QR-Rechnung në faqe të veçantë
  doc.switchToPage(inhaltSeiten - 1);
  doc.addPage();
  const qrBill = new SwissQRBill({
    amount: rechnung.totalBrutto,
    currency: "CHF",
    message: `Rechnung ${rechnungNr(rechnung)}, Auftrag ${auftrag.nummer}`,
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
  });
  qrBill.attachTo(doc);

  doc.end();
  return {
    buffer: await fertig,
    dateiname: `Rechnung-${dateiTeil(rechnungNr(rechnung))}.pdf`,
    empfaengerEmail: kunde.email,
  };
}

export async function offertePdf(
  id: string,
  betriebId: string
): Promise<{ buffer: Buffer; dateiname: string; empfaengerEmail: string } | null> {
  const offerte = await db.offerte.findFirst({
    where: { id, betriebId },
    include: {
      betrieb: true,
      kunde: true,
      objekt: true,
      gruppen: {
        orderBy: { reihenfolge: "asc" },
        include: { positionen: { orderBy: { reihenfolge: "asc" } } },
      },
    },
  });
  if (!offerte) return null;

  const { betrieb, kunde } = offerte;
  const nr = offerteNummer(offerte);
  const { doc, fertig, fTitel, fLinie, fText } = dokumentStart(betrieb);

  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`Angebot ${nr}`, 50, 185);
  doc.fontSize(11).text(offerte.titel, 50).moveDown(0.5);
  doc.fillColor(fText).fontSize(9);
  const info: [string, string][] = [
    ["Datum:", offerte.datum.toLocaleDateString("de-CH")],
    ["Gültig bis:", offerte.gueltigBis.toLocaleDateString("de-CH")],
  ];
  if (offerte.objekt) info.push(["Objekt:", offerte.objekt.bezeichnung]);
  if (betrieb.mwstNr) info.push(["MwSt. Nr.:", betrieb.mwstNr]);
  for (const [label, wert] of info) {
    const y0 = doc.y;
    doc.font("Helvetica-Bold").text(label, 50, y0, { width: 80 });
    doc.font("Helvetica").text(wert, 135, y0, { width: 415 });
  }

  doc.moveDown(1.2);
  doc
    .font("Helvetica")
    .text(`Guten Tag ${kunde.name}`, 50)
    .moveDown(0.5)
    .text(betrieb.offerteKopftext.trim() || "Danke für Ihr Interesse. Gerne unterbreiten wir Ihnen dieses Angebot:");

  const xPos = 50, xBez = 85, xMenge = 330, xEinheit = 380, xAnsatz = 420, xTotal = 490;
  let y = doc.y + 15;

  const kopf = () => {
    doc.fillColor(fTitel).font("Helvetica-Bold").fontSize(9);
    doc.text("Pos.", xPos, y);
    doc.text("Beschreibung", xBez, y);
    doc.text("Menge", xMenge, y, { width: 45, align: "right" });
    doc.text("Einheit", xEinheit, y);
    doc.text("Einzelpreis", xAnsatz, y, { width: 60, align: "right" });
    doc.text("Preis in CHF", xTotal, y, { width: 60, align: "right" });
    y += 14;
    doc.moveTo(xPos, y).lineTo(550, y).strokeColor(fLinie).stroke();
    y += 8;
    doc.fillColor(fText).font("Helvetica").fontSize(9);
  };
  const neueSeiteWennNoetig = (hoehe: number) => {
    if (y + hoehe > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      kopf();
    }
  };
  kopf();

  offerte.gruppen.forEach((gruppe, gi) => {
    const gruppenTotal = gruppe.positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);
    neueSeiteWennNoetig(18);
    doc.font("Helvetica-Bold").fillColor(fTitel);
    doc.text(String(gi + 1), xPos, y);
    doc.text(gruppe.titel, xBez, y, { width: 240 });
    doc.text(chf(gruppenTotal), xTotal, y, { width: 60, align: "right" });
    y += 18;
    doc.font("Helvetica").fillColor(fText);

    gruppe.positionen.forEach((p, pi) => {
      const zeilen = p.bezeichnung.split("\n");
      const haupt = zeilen[0];
      const details = zeilen.slice(1);
      const hoeheHaupt = Math.max(13, doc.heightOfString(haupt, { width: 240 }) + 2);
      const hoeheDetails = details.length
        ? doc.heightOfString(details.map((d) => `· ${d}`).join("\n"), { width: 225 }) + 4
        : 0;
      neueSeiteWennNoetig(hoeheHaupt + hoeheDetails + 6);

      doc.text(`${gi + 1}.${pi + 1}`, xPos, y);
      doc.text(haupt, xBez, y, { width: 240 });
      doc.text(String(p.menge), xMenge, y, { width: 45, align: "right" });
      doc.text(p.einheit, xEinheit, y);
      doc.text(chf(p.ansatz), xAnsatz, y, { width: 60, align: "right" });
      doc.text(chf(p.menge * p.ansatz), xTotal, y, { width: 60, align: "right" });
      y += hoeheHaupt;
      if (details.length) {
        doc.fillColor(fText).fontSize(8.5);
        doc.text(details.map((d) => `· ${d}`).join("\n"), xBez + 15, y, { width: 225 });
        y += hoeheDetails;
        doc.fontSize(9);
      }
      y += 4;
    });
    y += 6;
  });

  neueSeiteWennNoetig(70);
  doc.moveTo(xPos, y).lineTo(550, y).strokeColor(fLinie).stroke();
  y += 8;
  const totalNetto = offerte.gruppen
    .flatMap((g) => g.positionen)
    .reduce((s, p) => s + p.menge * p.ansatz, 0);
  const bruttoExakt = totalNetto * 1.081;
  const brutto = runde5Rappen(bruttoExakt);
  const rundung = brutto - bruttoExakt;
  const zeile = (label: string, wert: string, fett = false) => {
    doc.font(fett ? "Helvetica-Bold" : "Helvetica").fillColor(fett ? fTitel : fText);
    doc.text(label, xMenge, y, { width: 120, align: "right" });
    doc.text(wert, xTotal, y, { width: 60, align: "right" });
    y += 13;
  };
  zeile("Total", chf(totalNetto), true);
  zeile("Zzgl. MWST 8.10%", chf(bruttoExakt - totalNetto));
  if (Math.abs(rundung) >= 0.005) zeile("Rundungsdifferenz", chf(rundung));
  zeile("Betrag inkl. MWST", chf(brutto), true);

  doc
    .font("Helvetica")
    .fillColor(fText)
    .fontSize(9)
    .text(betrieb.offerteFusstext.trim() || "Bei Fragen oder Unklarheiten stehen wir Ihnen gerne zur Verfügung.", 50, y + 25, { width: 495 })
    .moveDown(1)
    .text("Freundliche Grüsse")
    .text(betrieb.name);

  footerAufSeiten(doc, betrieb, fText, `Angebot ${nr}`);

  doc.end();
  return {
    buffer: await fertig,
    dateiname: `Angebot-${dateiTeil(nr)}.pdf`,
    empfaengerEmail: kunde.email,
  };
}
