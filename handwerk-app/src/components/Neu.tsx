// Einklappbarer «＋ Neu»-Bereich: Listen bleiben übersichtlich, das Erfassungsformular erscheint erst auf Klick (wie bei bexio)
export default function Neu({
  label,
  offen = false,
  children,
}: {
  label: string;
  offen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={offen} className="group mt-4">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift group-open:bg-surface2 group-open:text-ink">
        <span className="group-open:hidden">＋ {label}</span>
        <span className="hidden group-open:inline">✕ Schliessen</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
