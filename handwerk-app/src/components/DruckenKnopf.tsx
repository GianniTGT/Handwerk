"use client";

export default function DruckenKnopf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-forest px-4 py-2 text-sm font-semibold text-forest hover:bg-surface2 print:hidden"
    >
      🖨 Drucken / als PDF speichern
    </button>
  );
}
