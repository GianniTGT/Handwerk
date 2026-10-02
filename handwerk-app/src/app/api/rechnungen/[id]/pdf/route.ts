import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function logoBuffer(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  return m ? Buffer.from(m[2], "base64") : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const rechnung = await db.rechnung.findFirst({
    where: { id, betriebId: sitzung.mitarbeiter.betriebId },
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

  const fTitel = betrieb.farbeTitel || "#1C1C1E";
  const fLinie = betrieb.farbeLinien || "#9AA5A0";
  const fText = betrieb.farbeText || "#1C1C1E";

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const fertig = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );
  // Hapësirë për footer-in në çdo faqe përmbajtjeje
  doc.page.margins.bottom = 90;

  // Logo (Dokumenten-Designer) + Absender
  const logo = betrieb.logo ? logoBuffer(betrieb.logo) : null;
  if (logo) {
    try {
      doc.image(logo, 50, 42, { fit: [150, 55] });
    } catch {
      /* logo e palexueshme — vazhdo pa të */
    }
  }
  doc.fillColor(fTitel).fontSize(12).font("Helvetica-Bold").text(betrieb.name, 50, logo ? 105 : 50);
  doc.fillColor(fText).fontSize(9).font("Helvetica").text(`${betrieb.strasse} · ${betrieb.plz} ${betrieb.ort}`);

  // Empfänger djathtas
  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  // Titel + blloku informativ
  const zahlbarBis = new Date(rechnung.datum);
  zahlbarBis.setDate(zahlbarBis.getDate() + 30);
  doc.fillColor(fTitel).fontSize(13).font("Helvetica-Bold").text(`Rechnung RE-${rechnung.nummer}`, 50, 190);
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

  // Begrüssung (si standardi bexio/AINO)
  doc.moveDown(1.5);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Guten Tag ${kunde.name}`, 50)
    .moveDown(0.5)
    .text("Danke für Ihr Vertrauen. Ihre Rechnung setzt sich wie folgt zusammen:");

  // Tabela e pozicioneve me numra Pos.
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

  // Totalet me Rundungsdifferenz (rrumbullakimi 5-Rappen i shumës brutto)
  const bruttoExakt = rechnung.totalNetto * (1 + rechnung.mwstSatz / 100);
  const mwstBetrag = bruttoExakt - rechnung.totalNetto;
  const rundung = rechnung.totalBrutto - bruttoExakt;
  const zeile = (label: string, wert: string, fett = false) => {
    doc.font(fett ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, xEinheit - 50, y, { width: 110, align: "right" });
    doc.text(wert, xTotal, y, { width: 60, align: "right" });
    y += 13;
  };
  zeile("Total netto", chf(rechnung.totalNetto));
  zeile(`Zzgl. MwSt. ${rechnung.mwstSatz}%`, chf(mwstBetrag));
  if (Math.abs(rundung) >= 0.005) zeile("Rundungsdifferenz", chf(rundung));
  zeile("Betrag inkl. MwSt.", chf(rechnung.totalBrutto), true);

  // Mbyllja
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Sie haben Fragen? Melden Sie sich bei uns.", 50, y + 25)
    .moveDown(1)
    .text("Freundliche Grüsse")
    .text(betrieb.name)
    .moveDown(1)
    .fontSize(8)
    .text("Ihre QR-Rechnung befindet sich auf der nächsten Seite.");

  // Footer + numërimi i faqeve në faqet e përmbajtjes (jo në QR-faqen)
  const inhaltSeiten = doc.bufferedPageRange().count;
  for (let i = 0; i < inhaltSeiten; i++) {
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
    doc.text(`Rechnung RE-${rechnung.nummer} · Seite ${i + 1} von ${inhaltSeiten}`, 50, fy + 20, {
      width: 495,
      align: "center",
    });
    doc.page.margins.bottom = alteMargin;
  }

  // QR-Rechnung (Swiss QR-bill) në faqe të veçantë — si standardi bexio
  doc.switchToPage(inhaltSeiten - 1);
  doc.addPage();
  const qrBill = new SwissQRBill({
    amount: rechnung.totalBrutto,
    currency: "CHF",
    message: `Rechnung RE-${rechnung.nummer}, Auftrag ${auftrag.nummer}`,
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
      "Content-Disposition": `inline; filename="Rechnung-RE-${rechnung.nummer}.pdf"`,
    },
  });
}
