import { darf } from "@/lib/rechte";
import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serviron një foto rapporti si imazh real (jo data-URL në HTML) —
// me kontroll pronësie të tenant-it
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });
  if (!darf(sitzung.mitarbeiter, "AUFTRAEGE")) return new Response("Keine Berechtigung", { status: 403 });

  const { id } = await params;
  const foto = await db.rapportFoto.findFirst({
    where: {
      id,
      rapport: { auftrag: { betriebId: sitzung.aktiverBetrieb.id } },
    },
    select: { daten: true },
  });
  if (!foto) return new Response("Foto nicht gefunden", { status: 404 });

  const m = foto.daten.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response("Ungültige Daten", { status: 500 });

  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=3600",
    },
  });
}
