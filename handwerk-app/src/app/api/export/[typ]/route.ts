import { leseSitzung } from "@/lib/auth";
import { darf } from "@/lib/rechte";
import { EXPORT_TYPEN, exportiere } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const datum = (v: string | null) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// CSV-Export einer Liste (optional mit Zeitraum ?von=JJJJ-MM-TT&bis=JJJJ-MM-TT)
export async function GET(req: Request, { params }: { params: Promise<{ typ: string }> }) {
  const sitzung = await leseSitzung();
  if (!sitzung) return new Response("Nicht angemeldet", { status: 401 });

  const { typ } = await params;
  const def = EXPORT_TYPEN[typ];
  if (!def) return new Response("Unbekannter Export", { status: 404 });
  if (def.bereich && !darf(sitzung.mitarbeiter, def.bereich)) {
    return new Response("Keine Berechtigung", { status: 403 });
  }

  const url = new URL(req.url);
  const ergebnis = await exportiere(
    typ,
    sitzung.aktiverBetrieb.id,
    datum(url.searchParams.get("von")),
    datum(url.searchParams.get("bis"))
  );
  if (!ergebnis) return new Response("Unbekannter Export", { status: 404 });

  return new Response(ergebnis.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ergebnis.dateiname}"`,
      "Cache-Control": "no-store",
    },
  });
}
