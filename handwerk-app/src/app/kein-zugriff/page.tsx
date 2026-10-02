export const dynamic = "force-dynamic";

import Link from "next/link";

export default function KeinZugriff() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="mt-3 text-xl font-bold">Kein Zugriff</h1>
      <p className="mt-2 text-sm text-muted">
        Für diesen Bereich fehlt Ihnen die Berechtigung. Wenden Sie sich an Ihren Chef oder Administrator.
      </p>
      <Link href="/" className="mt-4 inline-block rounded bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest-lift">
        Zum Dashboard
      </Link>
    </div>
  );
}
