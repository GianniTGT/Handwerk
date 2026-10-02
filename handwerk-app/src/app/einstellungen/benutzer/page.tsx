export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createBenutzer, setBenutzerPasswort, updateBenutzer } from "@/lib/actions-benutzer";
import { ALLE_BEREICHE, BEREICHE, ROLLEN, standardRechte, wirksameRechte } from "@/lib/rechte";

const fehlerTexte: Record<string, string> = {
  eingabe: "Bitte Name, gültige E-Mail, Rolle und ein Passwort mit mind. 8 Zeichen angeben.",
  email: "Diese E-Mail-Adresse wird bereits verwendet.",
  passwort: "Das Passwort muss mindestens 8 Zeichen haben.",
  selbst: "Sie können sich nicht selbst deaktivieren.",
  "letzter-admin": "Es muss mindestens ein aktiver Benutzer mit der Berechtigung «Benutzer & Rechte» bleiben.",
  "nicht-gefunden": "Benutzer nicht gefunden.",
};

export default async function BenutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb, mitarbeiter: ich } = await sitzungErforderlich("BENUTZER");
  const sp = await searchParams;
  const benutzer = await db.mitarbeiter.findMany({
    where: { betriebId: betrieb.id },
    orderBy: [{ aktiv: "desc" }, { name: "asc" }],
  });
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/einstellungen" className="text-sm text-forest underline">← Einstellungen</Link>
      <h1 className="mt-1 text-xl font-bold">Benutzer &amp; Rechte</h1>
      <p className="mt-1 text-sm text-muted">
        Jede Rolle hat Standardrechte (Chef: alles, Büro: alles ausser Benutzerverwaltung, Monteur: Kontakte, Aufträge, Projekte &amp; Zeiten).
        Pro Benutzer lassen sich die Rechte einzeln anpassen.
      </p>
      {sp.gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      {sp.fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehlerTexte[sp.fehler] ?? "Aktion fehlgeschlagen."}</p>}

      <form action={createBenutzer} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Neuer Benutzer</h2>
        <input name="name" required placeholder="Name" className={feld} />
        <input name="email" type="email" required placeholder="E-Mail (Login)" className={feld} />
        <input name="passwort" type="password" minLength={8} required placeholder="Passwort (mind. 8 Zeichen)" className={feld} autoComplete="new-password" />
        <select name="rolle" defaultValue="MONTEUR" className={feld}>
          {ROLLEN.map((r) => (
            <option key={r.wert} value={r.wert}>{r.label}</option>
          ))}
        </select>
        <button className="rounded bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-2">Benutzer anlegen</button>
      </form>

      <ul className="mt-4 grid gap-3">
        {benutzer.map((b) => {
          const wirksam = wirksameRechte(b);
          return (
            <li key={b.id} className={`rounded-tiff border border-line bg-white p-4 shadow-sm ${b.aktiv ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{b.name}</span>
                  {b.id === ich.id && <span className="ml-2 text-xs text-muted">(Sie)</span>}
                  <div className="text-sm text-muted">{b.email || "kein Login"}{!b.aktiv && " · deaktiviert"}</div>
                </div>
                <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs">{ROLLEN.find((r) => r.wert === b.rolle)?.label ?? b.rolle}</span>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer select-none text-sm font-medium text-forest">Bearbeiten</summary>
                <form action={updateBenutzer} className="mt-2 grid gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
                    <input name="name" defaultValue={b.name} className={feld} />
                    <select name="rolle" defaultValue={b.rolle} className={feld}>
                      {ROLLEN.map((r) => (
                        <option key={r.wert} value={r.wert}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="rolleStandard" value="1" defaultChecked={!b.rechte.trim()} />
                    Standardrechte der Rolle verwenden
                  </label>
                  <fieldset className="grid gap-1 rounded border border-line p-2 text-sm">
                    <legend className="px-1 text-xs text-muted">Eigene Rechte (nur wirksam ohne Häkchen oben)</legend>
                    {ALLE_BEREICHE.map((bereich) => (
                      <label key={bereich} className="flex items-center gap-2">
                        <input type="checkbox" name={`recht_${bereich}`} value="1" defaultChecked={wirksam.includes(bereich)} />
                        {BEREICHE[bereich]}
                      </label>
                    ))}
                    <p className="text-xs text-muted">
                      Standard für {ROLLEN.find((r) => r.wert === b.rolle)?.label}: {standardRechte(b.rolle).map((x) => BEREICHE[x].split(",")[0]).join(" · ")}
                    </p>
                  </fieldset>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="aktiv" value="1" defaultChecked={b.aktiv} /> aktiv (darf sich anmelden)
                  </label>
                  <button className="w-fit rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
                </form>
                <form action={setBenutzerPasswort} className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <input name="passwort" type="password" minLength={8} required placeholder="Neues Passwort" className={feld} autoComplete="new-password" />
                  <button className="rounded border border-forest px-3 py-2 text-sm font-medium text-forest hover:bg-surface2">Passwort setzen</button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
