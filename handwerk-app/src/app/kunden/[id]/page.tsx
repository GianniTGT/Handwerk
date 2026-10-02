import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createObjekt } from "@/lib/actions";

export default async function KundeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kunde = await db.kunde.findUnique({
    where: { id },
    include: { objekte: true, auftraege: { orderBy: { datum: "desc" } } },
  });
  if (!kunde) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold">{kunde.name}</h1>
      <p className="text-sm text-slate-500">
        {kunde.strasse}, {kunde.plz} {kunde.ort} · {kunde.telefon} {kunde.email && `· ${kunde.email}`}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Objekte / Anlagen</h2>
          <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {kunde.objekte.map((o) => (
              <li key={o.id} className="p-3">
                <div className="font-medium">{o.bezeichnung}</div>
                <div className="text-sm text-slate-500">
                  {o.strasse}, {o.plz} {o.ort} {o.bemerkung && `· ${o.bemerkung}`}
                </div>
              </li>
            ))}
            {kunde.objekte.length === 0 && (
              <li className="p-3 text-sm text-slate-500">Noch keine Objekte.</li>
            )}
          </ul>

          <form action={createObjekt} className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <input type="hidden" name="kundeId" value={kunde.id} />
            <h3 className="text-sm font-semibold">Neues Objekt</h3>
            <div className="mt-2 grid gap-2">
              <input name="bezeichnung" required placeholder="Bezeichnung (z.B. Heizung Keller — Viessmann) *" className="rounded border border-slate-300 p-2 text-sm" />
              <input name="strasse" placeholder="Strasse" defaultValue={kunde.strasse} className="rounded border border-slate-300 p-2 text-sm" />
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <input name="plz" placeholder="PLZ" defaultValue={kunde.plz} className="rounded border border-slate-300 p-2 text-sm" />
                <input name="ort" placeholder="Ort" defaultValue={kunde.ort} className="rounded border border-slate-300 p-2 text-sm" />
              </div>
              <input name="bemerkung" placeholder="Bemerkung" className="rounded border border-slate-300 p-2 text-sm" />
              <button className="rounded bg-slate-900 p-2 text-sm font-medium text-white hover:bg-slate-700">
                Objekt speichern
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2 className="font-semibold">Aufträge</h2>
          <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {kunde.auftraege.map((a) => (
              <li key={a.id}>
                <Link href={`/auftraege/${a.id}`} className="block p-3 hover:bg-slate-50">
                  <div className="font-medium">
                    #{a.nummer} — {a.titel}
                  </div>
                  <div className="text-sm text-slate-500">
                    {a.status} · {a.datum.toLocaleDateString("de-CH")}
                  </div>
                </Link>
              </li>
            ))}
            {kunde.auftraege.length === 0 && (
              <li className="p-3 text-sm text-slate-500">Noch keine Aufträge.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
