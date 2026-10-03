// Initialen aus einem Namen: «Chef (Büro)» → «CB» — für Avatare ohne Foto
export const initialen = (name: string) =>
  name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
