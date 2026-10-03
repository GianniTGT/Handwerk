import { leseSitzung } from "@/lib/auth";
import { darf } from "@/lib/rechte";
import { sucheSearchCh } from "@/lib/searchch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy zu Search.ch für den Import beim Anlegen eines Kontakts (nur angemeldet und mit Recht «Kontakte»)
export async function GET(req: Request) {
  const sitzung = await leseSitzung();
  if (!sitzung) return Response.json({ fehler: "nicht-angemeldet" }, { status: 401 });
  if (!darf(sitzung.mitarbeiter, "KONTAKTE")) return Response.json({ fehler: "keine-berechtigung" }, { status: 403 });

  const url = new URL(req.url);
  const was = (url.searchParams.get("was") ?? "").trim().slice(0, 80);
  const wo = (url.searchParams.get("wo") ?? "").trim().slice(0, 60);
  if (was.length < 2) return Response.json({ fehler: "zu-kurz" }, { status: 400 });

  try {
    return Response.json({ treffer: await sucheSearchCh(was, wo) });
  } catch {
    return Response.json({ fehler: "nicht-erreichbar" }, { status: 502 });
  }
}
