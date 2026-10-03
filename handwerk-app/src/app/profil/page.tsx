export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";
import { aendereEigenesPasswort, aendereProfil, loescheProfilFoto, speichereProfilFoto } from "@/lib/actions-profil";
import ProfilFoto from "@/components/ProfilFoto";
import { initialen } from "@/lib/initialen";
import { ROLLEN } from "@/lib/rechte";

const fehlerTexte: Record<string, string> = {
  aktuell: "Das aktuelle Passwort ist falsch.",
  kurz: "Das neue Passwort muss mindestens 8 Zeichen haben.",
  wiederholung: "Die beiden neuen Passwörter stimmen nicht überein.",
  gleich: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
  email: "Das Passwort darf nicht Ihre E-Mail-Adresse sein.",
  name: "Bitte einen Namen angeben.",
};

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string; pflicht?: string; min?: string; profil?: string }>;
}) {
  const { mitarbeiter } = await sitzungErforderlich();
  const sp = await searchParams;
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold">Mein Profil</h1>
      <p className="mt-1 text-sm text-muted">
        {mitarbeiter.name} · {mitarbeiter.email ?? "kein Login"} · {ROLLEN.find((r) => r.wert === mitarbeiter.rolle)?.label ?? mitarbeiter.rolle}
      </p>

      {mitarbeiter.passwortAendern && (
        <p className="mt-3 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Aus Sicherheitsgründen müssen Sie Ihr Passwort jetzt ändern, bevor Sie weiterarbeiten können.
        </p>
      )}
      {sp.gespeichert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Passwort geändert ✓ Auf anderen Geräten wurden Sie abgemeldet.
        </p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {sp.fehler === "gesperrt"
            ? `Zu viele Fehlversuche. Bitte in ca. ${Math.max(1, Number(sp.min) || 15)} Minute(n) erneut versuchen.`
            : (fehlerTexte[sp.fehler] ?? "Passwort konnte nicht geändert werden.")}
        </p>
      )}

      {sp.profil && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Profil gespeichert ✓</p>}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
      <div className="grid gap-4">
      <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Profilbild</h2>
        <div className="mt-3">
          <ProfilFoto
            mitarbeiterId={mitarbeiter.id}
            fotoV={mitarbeiter.foto.length}
            initialen={initialen(mitarbeiter.name)}
            speichern={speichereProfilFoto}
            loeschen={loescheProfilFoto}
          />
        </div>
      </section>

      <form action={aendereProfil} className="grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Profil</h2>
        <label className="grid gap-0.5 text-xs text-muted">
          Name
          <input name="name" required defaultValue={mitarbeiter.name} maxLength={80} className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted">
          E-Mail (Login)
          <input value={mitarbeiter.email ?? ""} disabled className={`${feld} bg-surface2 text-muted`} readOnly />
          <span>Die E-Mail-Adresse ändert Ihr Administrator.</span>
        </label>
        <button className="w-fit rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Profil speichern</button>
      </form>
      </div>

      <form id="passwort" action={aendereEigenesPasswort} className="grid scroll-mt-20 gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Passwort ändern</h2>
        <input name="aktuell" type="password" required placeholder="Aktuelles Passwort" autoComplete="current-password" className={feld} />
        <input name="neu" type="password" required minLength={8} placeholder="Neues Passwort (mind. 8 Zeichen)" autoComplete="new-password" className={feld} />
        <input name="wiederholung" type="password" required minLength={8} placeholder="Neues Passwort wiederholen" autoComplete="new-password" className={feld} />
        <button className="w-fit rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Passwort ändern</button>
      </form>
      </div>
    </div>
  );
}
