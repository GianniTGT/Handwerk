import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Firmenlogo als echtes Bild (nicht als data-URL im HTML): nur für Betriebe, auf die der Benutzer Zugriff hat
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await params;
  if (!sitzung.betriebe.some((b) => b.id === id)) return new Response("Nicht gefunden", { status: 404 });

  const betrieb = await db.betrieb.findUnique({ where: { id }, select: { logo: true } });
  const m = betrieb?.logo.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!m) return new Response("Kein Logo", { status: 404 });

  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=86400" }, // Version über ?v= im Link
  });
}
