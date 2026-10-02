// Mahnwesen (3 shkallë, si te bexio): Zahlungserinnerung → 1. Mahnung → 2. Mahnung
import { faelligDatum } from "./faellig";

export const MAHNSTUFEN = ["", "Zahlungserinnerung", "1. Mahnung", "2. Mahnung"] as const;
const TAG = 24 * 60 * 60 * 1000;

type Fristen = {
  zahlungsfristTage: number;
  mahnfrist1Tage: number;
  mahnfrist2Tage: number;
  mahnfrist3Tage: number;
};
type RechnungMahn = {
  datum: Date;
  faelligAm: Date | null;
  status: string;
  mahnstufe: number;
  letzteMahnungAm: Date | null;
};

// Shkalla e radhës nëse faturës i vjen koha, përndryshe null
export function naechsteMahnstufe(r: RechnungMahn, b: Fristen, heute = new Date()): 1 | 2 | 3 | null {
  if (r.status !== "VERSENDET") return null;
  const t = heute.getTime();
  if (r.mahnstufe === 0) {
    return t >= faelligDatum(r, b.zahlungsfristTage).getTime() + b.mahnfrist1Tage * TAG ? 1 : null;
  }
  const letzte = r.letzteMahnungAm?.getTime() ?? 0;
  if (r.mahnstufe === 1) return t >= letzte + b.mahnfrist2Tage * TAG ? 2 : null;
  if (r.mahnstufe === 2) return t >= letzte + b.mahnfrist3Tage * TAG ? 3 : null;
  return null;
}

// Shuma e hapur pas zbritjes së Gutschrift-eve (rrumbullakim 5 Rappen)
export function offenerBetrag(r: { totalBrutto: number; gutschriften?: { totalBrutto: number }[] }) {
  const gs = (r.gutschriften ?? []).reduce((s, g) => s + g.totalBrutto, 0);
  return Math.max(0, Math.round((r.totalBrutto - gs) * 20) / 20);
}
