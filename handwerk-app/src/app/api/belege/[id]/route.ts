import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serviron dokumentin e Posteingang-ut (PDF/imazh) me kontroll pronësie të tenant-it
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const beleg = await db.beleg.findFirst({
    where: { id, betriebId: sitzung.aktiverBetrieb.id },
    select: { daten: true, dateiname: true },
  });
  if (!beleg) return new Response("Beleg nicht gefunden", { status: 404 });

  const m = beleg.daten.match(/^data:(application\/pdf|image\/(?:jpeg|png));base64,(.+)$/);
  if (!m) return new Response("Ungültige Daten", { status: 500 });

  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: {
      "Content-Type": m[1],
      "Content-Disposition": `inline; filename="${encodeURIComponent(beleg.dateiname)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
