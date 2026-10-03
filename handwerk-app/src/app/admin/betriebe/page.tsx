export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { leseSitzung } from "@/lib/auth";
import { istTiffAdmin } from "@/lib/registrierung";
import { createKundenBetrieb } from "@/lib/actions-admin";

const fehlerTexte: Record<string, string> = {
  eingabe: "Bitte Firma, Name, gültige E-Mail und ein Passwort mit mind. 8 Zeichen angeben.",
  email: "Diese E-Mail-Adresse wird bereits verwendet.",
};

export default async function AdminBetriebe({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; angelegt?: string }>;
}) {
  const sitzung = await leseSitzung();
  if (!sitzung) redirect("/login");
  if (!istTiffAdmin(sitzung.mitarbeiter.email)) redirect("/kein-zugriff");
  const sp = await searchParams;

  const betriebe = await db.betrieb.findMany({
    where: { id: { in: sitzung.betriebe.map((b) => b.id) } },
    include: { _count: { select: { mitarbeiter: true, kunden: true, rechnungen: true } } },
    orderBy: { name: "asc" },
  });
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold">Kunden-Betriebe (TIFF-Administration)</h1>
      <p className="mt-1 text-sm text-muted">
        Hier legen Sie neue Kunden-Betriebe mit ihrem Chef-Benutzer an. Die öffentliche Registrierung ist geschlossen.
        Sie erhalten automatisch Zugriff und wechseln über das Betriebs-Menü oben links in den neuen Betrieb.
      </p>
      {sp.angelegt && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Betrieb «{sp.angelegt}» angelegt. Zugangsdaten dem Kunden sicher übermitteln; er sollte das Passwort ändern lassen.
        </p>
      )}
      {sp.fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehlerTexte[sp.fehler] ?? "Fehler."}</p>}

      <form id="neu" action={createKundenBetrieb} className="mt-4 grid scroll-mt-20 gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Neuer Betrieb</h2>
        <input name="firmenname" required placeholder="Firmenname" className={`${feld} md:col-span-2`} />
        <input name="name" required placeholder="Name des Chefs" className={feld} />
        <input name="email" type="email" required placeholder="E-Mail (Login des Chefs)" className={feld} />
        <input name="passwort" type="password" required minLength={8} placeholder="Start-Passwort (mind. 8 Zeichen)" className={`${feld} md:col-span-2`} autoComplete="new-password" />
        <button className="rounded bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-2">Betrieb anlegen</button>
      </form>

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {betriebe.map((b) => (
          <li key={b.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
            <span className="font-medium">{b.name}</span>
            <span className="text-muted">
              {b._count.mitarbeiter} Benutzer · {b._count.kunden} Kontakte · {b._count.rechnungen} Rechnungen
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
