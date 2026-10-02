import { leseSitzung } from "@/lib/auth";
import { gutschriftPdf } from "@/lib/pdf-mahnung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const pdf = await gutschriftPdf(id, sitzung.aktiverBetrieb.id);
  if (!pdf) return new Response("Dokument nicht gefunden", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.dateiname}"`,
    },
  });
}
