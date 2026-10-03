import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createObjekt, deleteKunde, deleteObjekt } from "@/lib/actions";
import { archiviereKunde, createKontaktperson, deleteKontaktperson } from "@/lib/actions-kontakte";
import { chf, offerteNummer } from "@/lib/format";
import { projektNr, rechnungNr } from "@/lib/nrtext";
import { offenerBetrag } from "@/lib/mahnwesen";

export default async function KundeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fehler?: string; gespeichert?: string }>;
}) {
  const { id } = await params;
  const { fehler, gespeichert } = await searchParams;
  const { betrieb } = await sitzungErforderlich();
  const kunde = await db.kunde.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      objekte: true,
      kontaktpersonen: { orderBy: { name: "asc" } },
      auftraege: { orderBy: { datum: "desc" }, include: { rechnungen: { orderBy: { datum: "desc" }, include: { gutschriften: true } } } },
      offerten: { orderBy: { datum: "desc" } },
      projekte: { orderBy: { nummer: "desc" } },
      wartungsvertraege: { orderBy: { naechsteWartung: "asc" }, include: { objekt: true } },
    },
  });
  if (!kunde) notFound();
  // Rechnungen hängen am Auftrag — für die Kontaktübersicht zusammenziehen
  const rechnungen = kunde.auftraege.flatMap((a) => a.rechnungen.map((r) => ({ ...r, auftragTitel: a.titel })));
  rechnungen.sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const offenCHF = rechnungen.filter((r) => r.status === "VERSENDET").reduce((s, r) => s + offenerBetrag(r), 0);
  // Schnellaktionen wie bei bexio: neues Dokument direkt für diesen Kontakt
  const schnell: [string, string][] = [
    ["Offerte", `/offerten/neu?kunde=${kunde.id}`],
    ["Auftrag", `/auftraege/neu?kunde=${kunde.id}`],
    ["Projekt", `/projekte/neu?kunde=${kunde.id}`],
    ["Aufgabe", `/aufgaben/neu?kunde=${kunde.id}`],
    ["Wartungsvertrag", kunde.objekte.length === 1 ? `/wartung/neu?objekt=${kunde.objekte[0].id}` : "/wartung/neu"],
  ];
  const ansprechpartner = kunde.ansprechpartnerId
    ? await db.mitarbeiter.findFirst({ where: { id: kunde.ansprechpartnerId, betriebId: betrieb.id }, select: { name: true } })
    : null;
  const zeilen: [string, string][] = [
    ["Adresse", [kunde.strasse, kunde.adresszusatz, `${kunde.plz} ${kunde.ort}`.trim(), kunde.land !== "Schweiz" ? kunde.land : ""].filter(Boolean).join(", ")],
    ["E-Mail", [kunde.email, kunde.email2].filter(Boolean).join(" · ")],
    ["Telefon", [kunde.telefon, kunde.telefon2, kunde.mobile].filter(Boolean).join(" · ")],
    ["Website", kunde.website],
    ["Ansprechpartner (intern)", ansprechpartner?.name ?? ""],
    ["Kategorie / Branche", [kunde.kategorie, kunde.branche].filter(Boolean).join(" · ")],
    ["Korrespondenz", `${kunde.korrespondenzweg === "POST" ? "Post" : "E-Mail"} · ${kunde.sprache}`],
    ["Rabatt", kunde.rabatt > 0 ? `${kunde.rabatt} %` : ""],
    ["MWST-Nr. / UID", [kunde.mwstNr, kunde.uid].filter(Boolean).join(" · ")],
    ["Handelsregister", kunde.handelsregisterNr],
    ["Mitarbeitende", kunde.anzahlMitarbeiter != null ? String(kunde.anzahlMitarbeiter) : ""],
  ];

  return (
    <div>
      {fehler === "hat-dokumente" && (
        <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Kunde kann nicht gelöscht werden: es existieren Aufträge/Offerten. Geschäftsdokumente
          müssen aufbewahrt werden.
        </p>
      )}
      {fehler === "objekt-hat-dokumente" && (
        <p className="mb-3 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Objekt kann nicht gelöscht werden: es hängen Aufträge/Offerten daran.
        </p>
      )}
      {gespeichert && <p className="mb-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold">
          {kunde.typ === "PRIVAT" ? "👤" : "🏢"} {kunde.name}
          {kunde.kontaktNr ? <span className="ml-2 text-sm font-normal text-muted">#{kunde.kontaktNr}</span> : null}
          {kunde.archiviert && <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-xs font-normal text-muted">archiviert</span>}
        </h1>
        <div className="flex gap-2">
        <Link href={`/kunden/${kunde.id}/bearbeiten`} className="rounded bg-forest px-3 py-1 text-xs font-semibold text-white hover:bg-forest-lift">✎ Bearbeiten</Link>
        <form action={archiviereKunde}>
          <input type="hidden" name="kundeId" value={kunde.id} />
          <input type="hidden" name="archiviert" value={kunde.archiviert ? "0" : "1"} />
          <button className="rounded border border-line px-3 py-1 text-xs hover:bg-surface2">
            {kunde.archiviert ? "Wiederherstellen" : "Archivieren"}
          </button>
        </form>
        <form action={deleteKunde}>
          <input type="hidden" name="kundeId" value={kunde.id} />
          <button className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50">
            Kunde löschen
          </button>
        </form>
        </div>
      </div>
      {!kunde.archiviert && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-1 text-muted">Neu für diesen Kontakt:</span>
          {schnell.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-full border border-line bg-white px-3 py-1 hover:bg-surface2">
              ＋ {label}
            </Link>
          ))}
        </div>
      )}
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 rounded-tiff border border-line bg-white p-4 text-sm sm:grid-cols-2">
        {zeilen.filter(([, w]) => w).map(([l, w]) => (
          <div key={l} className="flex gap-2">
            <dt className="w-40 shrink-0 text-muted">{l}</dt>
            <dd className="min-w-0 break-words">{w}</dd>
          </div>
        ))}
        {kunde.bemerkung && (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="w-40 shrink-0 text-muted">Bemerkungen</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words">{kunde.bemerkung}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-6 font-semibold">Kontaktpersonen</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {kunde.kontaktpersonen.map((p) => (
          <li key={p.id} className="flex items-start justify-between p-3 text-sm">
            <div>
              <div className="font-medium">{p.name}{p.funktion && <span className="font-normal text-muted"> · {p.funktion}</span>}</div>
              <div className="text-muted">{[p.telefon, p.mobile, p.email].filter(Boolean).join(" · ")}</div>
            </div>
            <form action={deleteKontaktperson}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-muted hover:text-red-600">✕</button>
            </form>
          </li>
        ))}
        {kunde.kontaktpersonen.length === 0 && <li className="p-3 text-sm text-muted">Keine Kontaktpersonen (z.B. Hauswart, Verwalter).</li>}
      </ul>
      <form action={createKontaktperson} className="mt-2 grid gap-2 rounded-tiff border border-line bg-white p-3 md:grid-cols-6">
        <input type="hidden" name="kundeId" value={kunde.id} />
        <input name="name" required placeholder="Name *" className="rounded border border-line p-2 text-sm md:col-span-2" />
        <input name="funktion" placeholder="Funktion" className="rounded border border-line p-2 text-sm" />
        <input name="telefon" placeholder="Telefon" className="rounded border border-line p-2 text-sm" />
        <input name="email" placeholder="E-Mail" className="rounded border border-line p-2 text-sm" />
        <button className="rounded border border-forest p-2 text-sm font-medium text-forest hover:bg-surface2">Hinzufügen</button>
      </form>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Objekte / Anlagen</h2>
          <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
            {kunde.objekte.map((o) => (
              <li key={o.id} className="flex items-start justify-between p-3">
                <div>
                <div className="font-medium">{o.bezeichnung}</div>
                <div className="text-sm text-muted">
                  {o.strasse}, {o.plz} {o.ort} {o.bemerkung && `· ${o.bemerkung}`}
                </div>
                </div>
                <form action={deleteObjekt}>
                  <input type="hidden" name="objektId" value={o.id} />
                  <button className="text-muted hover:text-red-600">✕</button>
                </form>
              </li>
            ))}
            {kunde.objekte.length === 0 && (
              <li className="p-3 text-sm text-muted">Noch keine Objekte.</li>
            )}
          </ul>

          <form action={createObjekt} className="mt-4 rounded-tiff border border-line bg-white p-4">
            <input type="hidden" name="kundeId" value={kunde.id} />
            <h3 className="text-sm font-semibold">Neues Objekt</h3>
            <div className="mt-2 grid gap-2">
              <input name="bezeichnung" required placeholder="Bezeichnung (z.B. Heizung Keller — Viessmann) *" className="rounded border border-line p-2 text-sm" />
              <input name="strasse" placeholder="Strasse" defaultValue={kunde.strasse} className="rounded border border-line p-2 text-sm" />
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <input name="plz" placeholder="PLZ" defaultValue={kunde.plz} className="rounded border border-line p-2 text-sm" />
                <input name="ort" placeholder="Ort" defaultValue={kunde.ort} className="rounded border border-line p-2 text-sm" />
              </div>
              <input name="bemerkung" placeholder="Bemerkung" className="rounded border border-line p-2 text-sm" />
              <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
                Objekt speichern
              </button>
            </div>
          </form>
        </div>

        <div className="grid content-start gap-6">
          <div>
            <h2 className="font-semibold">Offerten ({kunde.offerten.length})</h2>
            <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white text-sm">
              {kunde.offerten.slice(0, 8).map((o) => (
                <li key={o.id}>
                  <Link href={`/offerten/${o.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-surface2">
                    <span className="min-w-0 truncate"><span className="font-medium">{offerteNummer(o)}</span> — {o.titel}</span>
                    <span className="shrink-0 text-xs text-muted">{offerteStatus[o.status] ?? o.status} · {o.datum.toLocaleDateString("de-CH")}</span>
                  </Link>
                </li>
              ))}
              {kunde.offerten.length === 0 && <li className="p-3 text-muted">Noch keine Offerten.</li>}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Aufträge ({kunde.auftraege.length})</h2>
            <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white text-sm">
              {kunde.auftraege.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <Link href={`/auftraege/${a.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-surface2">
                    <span className="min-w-0 truncate"><span className="font-medium">#{a.nummer}</span> — {a.titel}</span>
                    <span className="shrink-0 text-xs text-muted">{a.status} · {a.datum.toLocaleDateString("de-CH")}</span>
                  </Link>
                </li>
              ))}
              {kunde.auftraege.length === 0 && <li className="p-3 text-muted">Noch keine Aufträge.</li>}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">
              Rechnungen ({rechnungen.length})
              {offenCHF > 0 && <span className="ml-2 text-sm font-normal text-red-700">offen CHF {chf(offenCHF)}</span>}
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white text-sm">
              {rechnungen.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <Link href={`/rechnungen/${r.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-surface2">
                    <span className="min-w-0 truncate"><span className="font-medium">{rechnungNr(r)}</span> — {r.auftragTitel}</span>
                    <span className="shrink-0 text-xs text-muted">CHF {chf(r.totalBrutto)} · {rechnungStatus[r.status] ?? r.status}</span>
                  </Link>
                </li>
              ))}
              {rechnungen.length === 0 && <li className="p-3 text-muted">Noch keine Rechnungen.</li>}
            </ul>
          </div>
          {(kunde.projekte.length > 0 || kunde.wartungsvertraege.length > 0) && (
            <div>
              <h2 className="font-semibold">Projekte &amp; Wartungsverträge</h2>
              <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white text-sm">
                {kunde.projekte.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projekte/${p.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-surface2">
                      <span className="min-w-0 truncate"><span className="font-medium">{projektNr(p)}</span> — {p.name}</span>
                      <span className="shrink-0 text-xs text-muted">{p.status}</span>
                    </Link>
                  </li>
                ))}
                {kunde.wartungsvertraege.map((v) => (
                  <li key={v.id}>
                    <Link href={`/wartung?q=WV-${v.nummer}&filter=alle`} className="flex items-center justify-between gap-2 p-3 hover:bg-surface2">
                      <span className="min-w-0 truncate"><span className="font-medium">WV-{v.nummer}</span> — {v.titel} · {v.objekt.bezeichnung}</span>
                      <span className="shrink-0 text-xs text-muted">{v.status} · nächste {v.naechsteWartung.toLocaleDateString("de-CH")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const offerteStatus: Record<string, string> = { ENTWURF: "Entwurf", GESENDET: "Offen", ANGENOMMEN: "Bestätigt", ABGELEHNT: "Abgelehnt" };
const rechnungStatus: Record<string, string> = { ENTWURF: "Entwurf", VERSENDET: "Offen", BEZAHLT: "Bezahlt" };
