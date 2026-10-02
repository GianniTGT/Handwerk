import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rechnung = await db.rechnung.findUnique({
    where: { id },
    include: {
      betrieb: true,
      auftrag: {
        include: { kunde: true, objekt: true, rapporte: { include: { positionen: true } } },
      },
    },
  });
  if (!rechnung) return new Response("Rechnung nicht gefunden", { status: 404 });

  const { betrieb, auftrag } = rechnung;
  const kunde = auftrag.kunde;
  const positionen = auftrag.rapporte.flatMap((r) => r.positionen);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fertig = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );

  // Kopfzeile: Absender
  doc.fontSize(14).font("Helvetica-Bold").text(betrieb.name);
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(`${betrieb.strasse} · ${betrieb.plz} ${betrieb.ort}`)
    .moveDown(2);

  // Empfänger
  doc
    .fontSize(10)
    .text(kunde.name, 350)
    .text(kunde.strasse, 350)
    .text(`${kunde.plz} ${kunde.ort}`, 350)
    .moveDown(2);

  // Titel
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(`Rechnung Nr. ${rechnung.nummer}`, 50)
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Datum: ${rechnung.datum.toLocaleDateString("de-CH")} · Auftrag #${auftrag.nummer} — ${auftrag.titel}` +
        (auftrag.objekt ? ` · Objekt: ${auftrag.objekt.bezeichnung}` : "")
    )
    .moveDown(1);

  // Tabelle e pozicioneve
  const xBez = 50, xMenge = 320, xEinheit = 370, xAnsatz = 420, xTotal = 490;
  let y = doc.y + 5;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Bezeichnung", xBez, y);
  doc.text("Menge", xMenge, y, { width: 40, align: "right" });
  doc.text("Einheit", xEinheit, y);
  doc.text("Ansatz", xAnsatz, y, { width: 60, align: "right" });
  doc.text("Total CHF", xTotal, y, { width: 60, align: "right" });
  y += 14;
  doc.moveTo(xBez, y).lineTo(550, y).strokeColor("#999").stroke();
  y += 6;

  doc.font("Helvetica").fontSize(9);
  for (const p of positionen) {
    doc.text(p.bezeichnung, xBez, y, { width: 260 });
    doc.text(String(p.menge), xMenge, y, { width: 40, align: "right" });
    doc.text(p.einheit, xEinheit, y);
    doc.text(chf(p.ansatz), xAnsatz, y, { width: 60, align: "right" });
    doc.text(chf(p.menge * p.ansatz), xTotal, y, { width: 60, align: "right" });
    y += Math.max(14, doc.heightOfString(p.bezeichnung, { width: 260 }) + 2);
  }

  y += 4;
  doc.moveTo(xBez, y).lineTo(550, y).strokeColor("#999").stroke();
  y += 8;
  const mwstBetrag = rechnung.totalBrutto - rechnung.totalNetto;
  doc.text("Total netto", xAnsatz, y, { width: 60, align: "right" });
  doc.text(chf(rechnung.totalNetto), xTotal, y, { width: 60, align: "right" });
  y += 13;
  doc.text(`MwSt ${rechnung.mwstSatz}%`, xAnsatz, y, { width: 60, align: "right" });
  doc.text(chf(mwstBetrag), xTotal, y, { width: 60, align: "right" });
  y += 13;
  doc.font("Helvetica-Bold");
  doc.text("Total CHF", xAnsatz, y, { width: 60, align: "right" });
  doc.text(chf(rechnung.totalBrutto), xTotal, y, { width: 60, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(8)
    .text("Zahlbar innert 30 Tagen. Vielen Dank für Ihren Auftrag.", 50, y + 30);

  // QR-Rechnung (Swiss QR-bill) në fund të faqes
  const qrBill = new SwissQRBill({
    amount: rechnung.totalBrutto,
    currency: "CHF",
    message: `Rechnung ${rechnung.nummer}, Auftrag ${auftrag.nummer}`,
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
  const buffer = await fertig;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${rechnung.nummer}.pdf"`,
    },
  });
}
