// Formular i ripërdorshëm "Per E-Mail senden" (server component, pa JS klienti)
export default function EmailForm({
  action,
  hiddenName,
  hiddenValue,
  an,
  betreff,
  text,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenName: string;
  hiddenValue: string;
  an: string;
  betreff: string;
  text: string;
}) {
  return (
    <details className="rounded-tiff border border-line bg-white">
      <summary className="cursor-pointer select-none p-3 text-sm font-semibold hover:bg-surface2">
        ✉️ Per E-Mail senden
      </summary>
      <form action={action} className="grid gap-2 border-t border-line p-3">
        <input type="hidden" name={hiddenName} value={hiddenValue} />
        <label className="grid gap-1 text-xs text-muted">
          An
          <input
            name="an"
            type="email"
            required
            defaultValue={an}
            placeholder="kunde@firma.ch"
            className="rounded border border-line p-2 text-sm text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Betreff
          <input
            name="betreff"
            required
            defaultValue={betreff}
            className="rounded border border-line p-2 text-sm text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Nachricht (PDF wird automatisch angehängt)
          <textarea
            name="text"
            rows={5}
            defaultValue={text}
            className="rounded border border-line p-2 text-sm text-ink"
          />
        </label>
        <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
          Senden
        </button>
      </form>
    </details>
  );
}

export function EmailStatusBanner({ status }: { status?: string }) {
  if (!status) return null;
  const stile: Record<string, [string, string]> = {
    ok: ["bg-green-100 text-green-800", "E-Mail wurde versendet ✓"],
    simuliert: [
      "bg-amber-100 text-amber-800",
      "E-Mail simuliert (kein SMTP konfiguriert — siehe .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).",
    ],
    fehler: ["bg-red-100 text-red-700", "E-Mail-Versand fehlgeschlagen — SMTP-Einstellungen prüfen."],
    ungueltig: ["bg-red-100 text-red-700", "Ungültige E-Mail-Adresse."],
  };
  const [klasse, tekst] = stile[status] ?? ["bg-surface2 text-ink", status];
  return <p className={`mb-3 rounded p-2 text-sm ${klasse}`}>{tekst}</p>;
}
