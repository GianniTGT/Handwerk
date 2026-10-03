import { darf } from "@/lib/rechte";
import { leseSitzung } from "@/lib/auth";
import { rechnungPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });
  if (!darf(sitzung.mitarbeiter, "VERKAUF")) return new Response("Keine Berechtigung", { status: 403 });

  const { id } = await params;
  let pdf;
  try {
    pdf = await rechnungPdf(id, sitzung.aktiverBetrieb.id);
  } catch (e) {
    // p.sh. IBAN mungon/e pavlefshme për QR-Rechnung
    const grund = e instanceof Error ? e.message : "unbekannter Fehler";
    return new Response(
      `PDF konnte nicht erstellt werden (${grund}). Bitte unter Einstellungen → Bank & QR-Rechnung eine gültige IBAN hinterlegen.`,
      { status: 422 }
    );
  }
  if (!pdf) return new Response("Rechnung nicht gefunden", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.dateiname}"`,
    },
  });
}
