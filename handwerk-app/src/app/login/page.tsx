import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/lib/actions";
import { leseSitzung } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (await leseSitzung()) redirect("/");
  const { fehler } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-center text-2xl font-bold">🔧 Handwerk</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Anmelden</p>
      {fehler && (
        <p className="mt-4 rounded bg-red-100 p-2 text-center text-sm text-red-700">
          E-Mail oder Passwort falsch.
        </p>
      )}
      <form action={login} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input
          name="email"
          type="email"
          required
          placeholder="E-Mail"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <input
          name="passwort"
          type="password"
          required
          placeholder="Passwort"
          className="rounded border border-slate-300 p-2 text-sm"
        />
        <button className="rounded bg-slate-900 p-2 text-sm font-medium text-white hover:bg-slate-700">
          Anmelden
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="underline">
          Betrieb registrieren
        </Link>
      </p>
    </div>
  );
}
