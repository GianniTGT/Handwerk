import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Profilbild eines Benutzers als echtes Bild: nur für Personen aus Betrieben, auf die der Anfragende Zugriff hat
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await params;

  const m = await db.mitarbeiter.findUnique({ where: { id }, select: { foto: true, betriebId: true } });
  if (!m || !sitzung.betriebe.some((b) => b.id === m.betriebId)) return new Response("Nicht gefunden", { status: 404 });
  const bild = m.foto.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!bild) return new Response("Kein Foto", { status: 404 });

  return new Response(new Uint8Array(Buffer.from(bild[2], "base64")), {
    headers: { "Content-Type": bild[1], "Cache-Control": "private, max-age=86400" }, // Version über ?v= im Link
  });
}
