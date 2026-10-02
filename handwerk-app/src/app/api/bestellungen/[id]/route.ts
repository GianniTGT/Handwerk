import { darf } from "@/lib/rechte";
import { leseSitzung } from "@/lib/auth";
import { bestellungPdf } from "@/lib/pdf-bestellung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });
  if (!darf(sitzung.mitarbeiter, "EINKAUF")) return new Response("Keine Berechtigung", { status: 403 });

  const { id } = await params;
  const pdf = await bestellungPdf(id, sitzung.aktiverBetrieb.id);
  if (!pdf) return new Response("Bestellung nicht gefunden", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.dateiname}"`,
    },
  });
}
