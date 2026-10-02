import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createObjekt, deleteKunde, deleteObjekt } from "@/lib/actions";

export default async function KundeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { id } = await params;
  const { fehler } = await searchParams;
  const { betrieb } = await sitzungErforderlich();
  const kunde = await db.kunde.findFirst({
    where: { id, betriebId: betrieb.id },
    include: { objekte: true, auftraege: { orderBy: { datum: "desc" } } },
  });
  if (!kunde) notFound();

  return (
    <div>
      {fehler === "hat-dokumente" && (
        <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Kunde kann nicht gelöscht werden: es existieren Aufträge/Offerten. Geschäftsdokumente
          müssen aufbewahrt werden.
        </p>
      )}
      {fehler === "objekt-hat-dokumente" && (
        <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Objekt kann nicht gelöscht werden: es hängen Aufträge/Offerten daran.
        </p>
      )}
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold">{kunde.name}</h1>
        <form action={deleteKunde}>
          <input type="hidden" name="kundeId" value={kunde.id} />
          <button className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50">
            Kunde löschen
          </button>
        </form>
      </div>
      <p className="text-sm text-muted">
        {kunde.strasse}, {kunde.plz} {kunde.ort} · {kunde.telefon} {kunde.email && `· ${kunde.email}`}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Objekte / Anlagen</h2>
          <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
            {kunde.objekte.map((o) => (
              <li key={o.id} className="flex items-start justify-between p-3">
                <div>
                <div className="font-medium">{o.bezeichnung}</div>
                <div className="text-sm text-muted">
                  {o.strasse}, {o.plz} {o.ort} {o.bemerkung && `· ${o.bemerkung}`}
                </div>
                </div>
                <form action={deleteObjekt}>
                  <input type="hidden" name="objektId" value={o.id} />
                  <button className="text-muted hover:text-red-600">✕</button>
                </form>
              </li>
            ))}
            {kunde.objekte.length === 0 && (
              <li className="p-3 text-sm text-muted">Noch keine Objekte.</li>
            )}
          </ul>

          <form action={createObjekt} className="mt-4 rounded-tiff border border-line bg-white p-4">
            <input type="hidden" name="kundeId" value={kunde.id} />
            <h3 className="text-sm font-semibold">Neues Objekt</h3>
            <div className="mt-2 grid gap-2">
              <input name="bezeichnung" required placeholder="Bezeichnung (z.B. Heizung Keller — Viessmann) *" className="rounded border border-line p-2 text-sm" />
              <input name="strasse" placeholder="Strasse" defaultValue={kunde.strasse} className="rounded border border-line p-2 text-sm" />
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <input name="plz" placeholder="PLZ" defaultValue={kunde.plz} className="rounded border border-line p-2 text-sm" />
                <input name="ort" placeholder="Ort" defaultValue={kunde.ort} className="rounded border border-line p-2 text-sm" />
              </div>
              <input name="bemerkung" placeholder="Bemerkung" className="rounded border border-line p-2 text-sm" />
              <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
                Objekt speichern
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2 className="font-semibold">Aufträge</h2>
          <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
            {kunde.auftraege.map((a) => (
              <li key={a.id}>
                <Link href={`/auftraege/${a.id}`} className="block p-3 hover:bg-surface2">
                  <div className="font-medium">
                    #{a.nummer} — {a.titel}
                  </div>
                  <div className="text-sm text-muted">
                    {a.status} · {a.datum.toLocaleDateString("de-CH")}
                  </div>
                </Link>
              </li>
            ))}
            {kunde.auftraege.length === 0 && (
              <li className="p-3 text-sm text-muted">Noch keine Aufträge.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
