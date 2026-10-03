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
  einstellungen: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  hilfe: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5" /><path d="M12 17h.01" /></>),
  suche: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  pfeil: <path d="M9 6l6 6-6 6" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  telefon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  abmelden: (<><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4" /><path d="M16 8l4 4-4 4M20 12H9" /></>),
  profil: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  gebaeude: (<><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16" /><path d="M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></>),
  globus: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>),
  pdf: (<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></>),
  download: (<><path d="M12 4v12M6 10l6 6 6-6" /><path d="M4 20h16" /></>),
  stift: (<><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 7l4 4" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  blitz: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  glocke: (<><path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z" /><path d="M10 21h4" /></>),
  lkw: (<><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></>),
  rueck: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></>),
  bild: (<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="M21 15l-5-5-9 9" /></>),
  drucker: (<><path d="M6 9V3h12v6" /><path d="M6 18H4v-8h16v8h-2" /><path d="M8 14h8v7H8z" /></>),
  kamera: (<><path d="M4 8h4l2-3h4l2 3h4v11H4z" /><circle cx="12" cy="13" r="3" /></>),
  geld: (<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>),
  uhr: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  werkzeug: <path d="M14.7 6.3a4 4 0 00-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 005.6-5.6l-2.8 2.8-2.1-.7-.7-2.1z" />,
  check: <path d="M5 13l4 4L19 7" />,
};

// Icon im Fliesstext oder in einem Knopf (sitzt auf der Grundlinie, kleiner Abstand rechts)
export function Ik({ name, className = "" }: { name: string; className?: string }) {
  return <Icon name={name} className={`mr-1.5 inline-block h-4 w-4 align-[-3px] ${className}`} />;
}

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
