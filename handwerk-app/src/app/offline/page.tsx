// Faqja fallback që Service Worker-i e tregon kur s'ka rrjet dhe faqja
// e kërkuar s'është në cache. Pa auth — statike dhe e para-cache-uar.
export default function OfflinePage() {
  return (
    <div className="mx-auto mt-24 max-w-sm text-center">
      <div className="text-5xl">📡</div>
      <h1 className="mt-4 text-xl font-bold">Keine Verbindung</h1>
      <p className="mt-2 text-sm text-muted">
        Diese Seite wurde noch nicht geladen. Bereits besuchte Seiten (z.B. Ihre heutigen
        Aufträge) bleiben offline verfügbar — Fotos und Unterschriften werden
        zwischengespeichert und automatisch synchronisiert, sobald wieder Netz da ist.
      </p>
      {/* kërkon ringarkim të plotë: faqja offline është jashtë routerit */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="mt-6 inline-block rounded bg-forest px-4 py-2 text-sm font-medium text-white"
      >
        Erneut versuchen
      </a>
    </div>
  );
}
