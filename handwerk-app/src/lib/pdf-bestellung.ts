// PDF për Bestellung (porosi te furnitori)
import { bestellungNr, dateiTeil } from "./nrtext";
import { db } from "./db";
import { chf } from "./format";
import { dokumentStart, footerAufSeiten } from "./pdf";

export async function bestellungPdf(
  id: string,
  betriebId: string
): Promise<{ buffer: Buffer; dateiname: string } | null> {
  const b = await db.bestellung.findFirst({
    where: { id, betriebId },
    include: { betrieb: true, lieferant: true, positionen: true },
  });
  if (!b) return null;
  const { betrieb } = b;
  const { doc, fertig, fTitel, fLinie, fText } = dokumentStart(betrieb);

  doc.fontSize(10).text(b.lieferant.name, 350, 120);

  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`Bestellung ${bestellungNr(b)}`, 50, 190);
  doc.fillColor(fText).fontSize(9).font("Helvetica").moveDown(0.5);
  doc.text(`Datum: ${b.datum.toLocaleDateString("de-CH")}`, 50);
  if (b.bemerkung) doc.text(`Bemerkung: ${b.bemerkung}`, 50, doc.y, { width: 495 });

  const xNr = 50, xBez = 120, xMenge = 360, xEinheit = 410, xPreis = 450, xTotal = 495;
  let y = doc.y + 20;
  doc.fillColor(fTitel).font("Helvetica-Bold");
  doc.text("Art-Nr", xNr, y);
  doc.text("Bezeichnung", xBez, y);
  doc.text("Menge", xMenge, y, { width: 45, align: "right" });
  doc.text("Einheit", xEinheit, y);
  doc.text("EK", xPreis, y, { width: 40, align: "right" });
  doc.text("Total", xTotal, y, { width: 55, align: "right" });
  y += 14;
  doc.moveTo(50, y).lineTo(550, y).strokeColor(fLinie).stroke();
  y += 6;

  doc.fillColor(fText).font("Helvetica");
  let summe = 0;
  for (const p of b.positionen) {
    const h = Math.max(14, doc.heightOfString(p.bezeichnung, { width: 235 }) + 2);
    if (y + h > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.text(p.artikelNr, xNr, y, { width: 65 });
    doc.text(p.bezeichnung, xBez, y, { width: 235 });
    doc.text(String(p.menge), xMenge, y, { width: 45, align: "right" });
    doc.text(p.einheit, xEinheit, y);
    doc.text(chf(p.preis), xPreis, y, { width: 40, align: "right" });
    doc.text(chf(p.menge * p.preis), xTotal, y, { width: 55, align: "right" });
    summe += p.menge * p.preis;
    y += h;
  }
  y += 4;
  doc.moveTo(50, y).lineTo(550, y).strokeColor(fLinie).stroke();
  doc.font("Helvetica-Bold").text(`Total netto CHF ${chf(summe)}`, 350, y + 8, { width: 200, align: "right" });
  doc.font("Helvetica").text("Bitte bestätigen Sie die Bestellung und den Liefertermin.", 50, y + 40);
  doc.moveDown(1).text("Freundliche Grüsse").text(betrieb.name);

  footerAufSeiten(doc, betrieb, fText, `Bestellung ${bestellungNr(b)}`);
  doc.end();
  return { buffer: await fertig, dateiname: `Bestellung-${dateiTeil(bestellungNr(b))}.pdf` };
}
