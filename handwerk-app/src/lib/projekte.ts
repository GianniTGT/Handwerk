// Substatus standard të projekteve (si te bexio) — i lirë për t'u zgjeruar
export const SUBSTATUS = [
  "Akquirierung",
  "Offertphase",
  "Projekt verloren",
  "Projektvorbereitung",
  "Projekt in Arbeit",
  "Endphase",
  "Dokumentation",
  "Projektabgabe",
  "Nachbearbeitung",
  "Ablage",
];
export const TAETIGKEITEN = ["Umsetzung", "Administration", "Allgemein", "Meeting", "Projekt Management", "Fahrzeit"];

export const stunden = (minuten: number) =>
  `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")}`;
