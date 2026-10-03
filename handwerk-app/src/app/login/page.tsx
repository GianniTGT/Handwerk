import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/lib/actions";
import { leseSitzung } from "@/lib/auth";
import { registrierungOffen } from "@/lib/registrierung";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; min?: string; zurueckgesetzt?: string }>;
}) {
  if (await leseSitzung()) redirect("/");
  const { fehler, min, zurueckgesetzt } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tiff-logo.svg" alt="Tiff" className="mx-auto h-14 w-14 rounded-tiff" />
      <h1 className="mt-3 text-center text-2xl font-bold">Handwerk</h1>
      <p className="text-center text-[10px] uppercase tracking-widest text-gold">by Tiff Software Solutions</p>
      <p className="mt-1 text-center text-sm text-muted">Anmelden</p>
      {zurueckgesetzt && (
        <p className="mt-4 rounded bg-green-100 p-2 text-center text-sm text-green-800">
          Passwort geändert. Bitte melden Sie sich mit dem neuen Passwort an.
        </p>
      )}
      {fehler && (
        <p className="mt-4 rounded bg-red-100 p-2 text-center text-sm text-red-700">
          {fehler === "gesperrt"
            ? `Zu viele Fehlversuche. Aus Sicherheitsgründen ist die Anmeldung für ca. ${Math.max(1, Number(min) || 15)} Minute(n) gesperrt.`
            : "E-Mail oder Passwort falsch."}
        </p>
      )}
      <form action={login} className="mt-6 grid gap-3 rounded-tiff border border-line bg-white p-6 shadow-sm">
        <input
          name="email"
          type="email"
          required
          placeholder="E-Mail"
          className="rounded border border-line p-2 text-sm"
        />
        <input
          name="passwort"
          type="password"
          required
          placeholder="Passwort"
          className="rounded border border-line p-2 text-sm"
        />
        <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
          Anmelden
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/passwort-vergessen" className="text-muted underline">
          Passwort vergessen?
        </Link>
      </p>
      {registrierungOffen() && (
      <p className="mt-4 text-center text-sm text-muted">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="underline">
          Betrieb registrieren
        </Link>
      </p>
      )}
    </div>
  );
}
