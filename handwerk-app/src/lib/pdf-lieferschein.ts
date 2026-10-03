// PDF për Lieferschein: pa çmime, me vend për konfirmimin e pranimit
import { db } from "./db";
import { dokumentStart, footerAufSeiten } from "./pdf";
import { dateiTeil, lieferscheinNr } from "./nrtext";

export async function lieferscheinPdf(
  id: string,
  betriebId: string
): Promise<{ buffer: Buffer; dateiname: string } | null> {
  const l = await db.lieferschein.findFirst({
    where: { id, betriebId },
    include: {
      betrieb: true,
      positionen: true,
      auftrag: { include: { kunde: true, objekt: true } },
    },
  });
  if (!l) return null;
  const { betrieb, auftrag } = l;
  const kunde = auftrag.kunde;
  const { doc, fertig, fTitel, fLinie, fText } = dokumentStart(betrieb);

  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`Lieferschein ${lieferscheinNr(l)}`, 50, 190);
  doc.fillColor(fText).fontSize(9).font("Helvetica").moveDown(0.6);
  const info: [string, string][] = [
    ["Datum:", l.datum.toLocaleDateString("de-CH")],
    ["Auftrag:", `#${auftrag.nummer} — ${auftrag.titel}`],
  ];
  if (auftrag.objekt) info.push(["Objekt:", auftrag.objekt.bezeichnung]);
  if (l.bemerkung) info.push(["Bemerkung:", l.bemerkung]);
  for (const [label, wert] of info) {
    const zy = doc.y;
    doc.font("Helvetica-Bold").text(label, 50, zy, { width: 80 });
    doc.font("Helvetica").text(wert, 135, zy, { width: 415 });
  }

  const xPos = 50, xBez = 80, xMenge = 420, xEinheit = 480;
  let y = doc.y + 20;
  doc.fillColor(fTitel).font("Helvetica-Bold");
  doc.text("Pos.", xPos, y);
  doc.text("Bezeichnung", xBez, y);
  doc.text("Menge", xMenge, y, { width: 50, align: "right" });
  doc.text("Einheit", xEinheit, y);
  y += 14;
  doc.moveTo(50, y).lineTo(550, y).strokeColor(fLinie).stroke();
  y += 6;

  doc.fillColor(fText).font("Helvetica");
  l.positionen.forEach((p, i) => {
    const h = Math.max(14, doc.heightOfString(p.bezeichnung, { width: 320 }) + 2);
    if (y + h > doc.page.height - doc.page.margins.bottom - 90) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.text(String(i + 1), xPos, y);
    doc.text(p.bezeichnung, xBez, y, { width: 320 });
    doc.text(String(p.menge), xMenge, y, { width: 50, align: "right" });
    doc.text(p.einheit, xEinheit, y);
    y += h;
  });
  y += 4;
  doc.moveTo(50, y).lineTo(550, y).strokeColor(fLinie).stroke();

  // Konfirmimi i pranimit
  const sy = Math.min(y + 50, doc.page.height - doc.page.margins.bottom - 60);
  doc.fontSize(9).text("Ware erhalten am: ____________________", 50, sy);
  doc.text("Unterschrift: ____________________________", 300, sy);

  footerAufSeiten(doc, betrieb, fText, `Lieferschein ${lieferscheinNr(l)}`);
  doc.end();
  return { buffer: await fertig, dateiname: `Lieferschein-${dateiTeil(lieferscheinNr(l))}.pdf` };
}
