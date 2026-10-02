export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";

export default async function PosteingangPage() {
  await sitzungErforderlich();
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <div className="text-4xl">📥</div>
      <h1 className="mt-3 text-xl font-bold">Posteingang</h1>
      <p className="mt-2 text-sm text-muted">Dokumente zentral empfangen und ablegen. Folgt nach der Pilotphase.</p>
      <span className="mt-4 inline-block rounded-full bg-surface2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
        Bald verfügbar
      </span>
    </div>
  );
}
