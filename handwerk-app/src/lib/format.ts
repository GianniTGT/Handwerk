export const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const offerteNummer = (o: { nummer: number; datum: Date; nummerText?: string }) =>
  o.nummerText ||
  `AN-${o.datum.getFullYear()}-${String(o.nummer).padStart(4, "0")}`;

// Rrumbullakimi zviceran 5-Rappen për shumat totale
export const runde5Rappen = (n: number) => Math.round(n * 20) / 20;
