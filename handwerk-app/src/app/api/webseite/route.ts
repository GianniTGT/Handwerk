import { leseSitzung } from "@/lib/auth";
import { darf } from "@/lib/rechte";
import { importVonWebseite } from "@/lib/webseite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Firmendaten von einer Webseite lesen (Import beim Anlegen eines Kontakts; nur angemeldet und mit Recht «Kontakte»)
export async function GET(req: Request) {
  const sitzung = await leseSitzung();
  if (!sitzung) return Response.json({ fehler: "nicht-angemeldet" }, { status: 401 });
  if (!darf(sitzung.mitarbeiter, "KONTAKTE")) return Response.json({ fehler: "keine-berechtigung" }, { status: 403 });

  const url = (new URL(req.url).searchParams.get("url") ?? "").trim().slice(0, 300);
  if (url.length < 4) return Response.json({ fehler: "ungueltige-url" }, { status: 400 });

  try {
    return Response.json({ treffer: await importVonWebseite(url) });
  } catch (e) {
    const grund = e instanceof Error ? e.message : "fehler";
    if (grund === "ungueltige-url" || grund === "host-gesperrt") return Response.json({ fehler: grund }, { status: 400 });
    return Response.json({ fehler: "nicht-erreichbar" }, { status: 502 });
  }
}
