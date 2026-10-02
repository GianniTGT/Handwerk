import Link from "next/link";
import { redirect } from "next/navigation";
import { registriereBetrieb } from "@/lib/actions";
import { leseSitzung } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fehlerTexte: Record<string, string> = {
  eingabe: "Bitte alle Felder ausfüllen (Passwort mind. 8 Zeichen).",
  email: "Diese E-Mail ist bereits registriert.",
};

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (await leseSitzung()) redirect("/");
  const { fehler } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tiff-logo.svg" alt="Tiff" className="mx-auto h-14 w-14 rounded-tiff" />
      <h1 className="mt-3 text-center text-2xl font-bold">Handwerk</h1>
      <p className="text-center text-[10px] uppercase tracking-widest text-gold">by Tiff Software Solutions</p>
      <p className="mt-1 text-center text-sm text-muted">Betrieb registrieren</p>
      {fehler && (
        <p className="mt-4 rounded bg-red-100 p-2 text-center text-sm text-red-700">
          {fehlerTexte[fehler] ?? "Registrierung fehlgeschlagen."}
        </p>
      )}
      <form
        action={registriereBetrieb}
        className="mt-6 grid gap-3 rounded-tiff border border-line bg-white p-6 shadow-sm"
      >
        <input name="firmenname" required placeholder="Firmenname (z.B. Muster Haustechnik GmbH)" className="rounded border border-line p-2 text-sm" />
        <input name="name" required placeholder="Ihr Name" className="rounded border border-line p-2 text-sm" />
        <input name="email" type="email" required placeholder="E-Mail" className="rounded border border-line p-2 text-sm" />
        <input name="passwort" type="password" required minLength={8} placeholder="Passwort (mind. 8 Zeichen)" className="rounded border border-line p-2 text-sm" />
        <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
          Registrieren
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Bereits registriert?{" "}
        <Link href="/login" className="underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
