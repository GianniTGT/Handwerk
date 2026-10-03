import Link from "next/link";
import { redirect } from "next/navigation";
import { leseSitzung } from "@/lib/auth";
import { fordereResetAn } from "@/lib/actions-reset";

export const dynamic = "force-dynamic";

export default async function PasswortVergessen({
  searchParams,
}: {
  searchParams: Promise<{ gesendet?: string; abgelaufen?: string }>;
}) {
  if (await leseSitzung()) redirect("/profil");
  const sp = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tiff-logo.svg" alt="Tiff" className="mx-auto h-14 w-14 rounded-tiff" />
      <h1 className="mt-3 text-center text-2xl font-bold">Passwort vergessen</h1>
      <p className="mt-1 text-center text-sm text-muted">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
      {sp.abgelaufen && (
        <p className="mt-4 rounded bg-amber-100 p-2 text-center text-sm text-amber-800">
          Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.
        </p>
      )}
      {sp.gesendet ? (
        <p className="mt-4 rounded bg-green-100 p-3 text-center text-sm text-green-800">
          Falls zu dieser E-Mail-Adresse ein Konto besteht, haben wir einen Link gesendet. Bitte prüfen Sie Ihr Postfach
          (auch den Spam-Ordner).
        </p>
      ) : (
        <form action={fordereResetAn} className="mt-6 grid gap-3 rounded-tiff border border-line bg-white p-6 shadow-sm">
          <input name="email" type="email" required placeholder="E-Mail" className="rounded border border-line p-2 text-sm" />
          <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">Link anfordern</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/login" className="underline">Zurück zur Anmeldung</Link>
      </p>
    </div>
  );
}
