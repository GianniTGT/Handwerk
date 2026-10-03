// Einheitliche Linien-Icons (ein Strich, currentColor) — statt Emojis, damit Menüs ruhig und gleichmässig wirken
const PFADE: Record<string, React.ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  kontakte: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  verkauf: (<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></>),
  ausgaben: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11L21 7H6" /></>),
  projekte: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3" /></>),
  produkte: (<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>),
  banking: (<><path d="M3 10l9-6 9 6" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" /></>),
  buchhaltung: (<><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></>),
  posteingang: (<><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></>),
  mehr: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
  einstellungen: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>),
  hilfe: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5" /><path d="M12 17h.01" /></>),
  suche: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  pfeil: <path d="M9 6l6 6-6 6" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  telefon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  abmelden: (<><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4" /><path d="M16 8l4 4-4 4M20 12H9" /></>),
  profil: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  gebaeude: (<><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16" /><path d="M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></>),
};

export default function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PFADE[name] ?? PFADE.mehr}
    </svg>
  );
}
