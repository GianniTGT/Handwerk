import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";
import { chf, offerteNummer, runde5Rappen } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const offerte = await db.offerte.findFirst({
    where: { id, betriebId: sitzung.mitarbeiter.betriebId },
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
  if (!offerte) return new Response("Offerte nicht gefunden", { status: 404 });

  const { betrieb, kunde } = offerte;
  const nr = offerteNummer(offerte);
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

  // Logo (Dokumenten-Designer) + dërguesi
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

  // Marrësi
  doc.fontSize(10).text(kunde.name, 350, 120);
  if (kunde.strasse) doc.text(kunde.strasse, 350);
  doc.text(`${kunde.plz} ${kunde.ort}`, 350);

  // Titulli + blloku informativ
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
    .text("Danke für Ihr Interesse. Gerne unterbreiten wir Ihnen dieses Angebot:");

  // Tabela hierarkike: 1 Gruppe (me total grupi) → 1.1, 1.2 nën-pozicione
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

  // Totalet
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
    .text("Bei Fragen oder Unklarheiten stehen wir Ihnen gerne zur Verfügung.", 50, y + 25)
    .moveDown(1)
    .text("Freundliche Grüsse")
    .text(betrieb.name);

  // Footer në çdo faqe
  const seiten = doc.bufferedPageRange().count;
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
    doc.text(`Angebot ${nr} · Seite ${i + 1} von ${seiten}`, 50, fy + 20, {
      width: 495,
      align: "center",
    });
    doc.page.margins.bottom = alteMargin;
  }

  doc.end();
  const buffer = await fertig;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Angebot-${nr}.pdf"`,
    },
  });
}
