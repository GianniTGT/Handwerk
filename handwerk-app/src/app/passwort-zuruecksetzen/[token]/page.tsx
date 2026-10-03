import { createHash } from "crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setzePasswortZurueck } from "@/lib/actions-reset";

export const dynamic = "force-dynamic";

const fehlerTexte: Record<string, string> = {
  kurz: "Das neue Passwort muss mindestens 8 Zeichen haben.",
  wiederholung: "Die beiden Passwörter stimmen nicht überein.",
  email: "Das Passwort darf nicht Ihre E-Mail-Adresse sein.",
};

export default async function PasswortZuruecksetzen({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { token: roh } = await params;
  const token = decodeURIComponent(roh);
  const { fehler } = await searchParams;
  const reset = await db.passwortReset.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
  });
  if (!reset || reset.gueltigBis < new Date()) redirect("/passwort-vergessen?abgelaufen=1");

  return (
    <div className="mx-auto mt-16 max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tiff-logo.svg" alt="Tiff" className="mx-auto h-14 w-14 rounded-tiff" />
      <h1 className="mt-3 text-center text-2xl font-bold">Neues Passwort</h1>
      {fehler && (
        <p className="mt-4 rounded bg-red-100 p-2 text-center text-sm text-red-700">{fehlerTexte[fehler] ?? "Fehler."}</p>
      )}
      <form action={setzePasswortZurueck} className="mt-6 grid gap-3 rounded-tiff border border-line bg-white p-6 shadow-sm">
        <input type="hidden" name="token" value={token} />
        <input name="neu" type="password" required minLength={8} placeholder="Neues Passwort (mind. 8 Zeichen)" autoComplete="new-password" className="rounded border border-line p-2 text-sm" />
        <input name="wiederholung" type="password" required minLength={8} placeholder="Passwort wiederholen" autoComplete="new-password" className="rounded border border-line p-2 text-sm" />
        <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">Passwort speichern</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/login" className="underline">Zurück zur Anmeldung</Link>
      </p>
    </div>
  );
}
