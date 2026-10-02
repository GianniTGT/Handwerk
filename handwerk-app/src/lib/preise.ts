// Llogaritja e çmimit neto të një artikulli për firmën:
// - artikull katalogu (me furnitor + çmim bruto): neto = brutto × (1 − rabatt%)
//   sipas Kondition-it të firmës për (furnitor, rabattgruppe); pa kondition → brutto
// - artikull manual: çmimi i futur direkt (preis)

type ArtikelPreisInfo = {
  einkaufspreis?: number;
  zuschlagProzent?: number;
  preis: number;
  bruttoPreis: number;
  rabattgruppe: string;
  lieferantId: string | null;
};

type KonditionInfo = {
  lieferantId: string;
  rabattgruppe: string;
  rabattProzent: number;
};

export function nettoPreis(artikel: ArtikelPreisInfo, konditionen: KonditionInfo[]): number {
  if (artikel.lieferantId && artikel.bruttoPreis > 0) {
    const kondition = konditionen.find(
      (k) =>
        k.lieferantId === artikel.lieferantId && k.rabattgruppe === artikel.rabattgruppe
    );
    const brutto = artikel.bruttoPreis;
    const netto = kondition ? brutto * (1 - kondition.rabattProzent / 100) : brutto;
    return Math.round(netto * 100) / 100;
  }
  return artikel.preis;
}

// Çmimi i blerjes (EK): katalog → neto pas rabatit; manual → einkaufspreis, ose preis (i vjetër)
export function einkaufsPreis(artikel: ArtikelPreisInfo, konditionen: KonditionInfo[]): number {
  if (artikel.lieferantId && artikel.bruttoPreis > 0) return nettoPreis(artikel, konditionen);
  return (artikel.einkaufspreis ?? 0) > 0 ? (artikel.einkaufspreis as number) : artikel.preis;
}

// Çmimi i shitjes (VK) = EK × (1 + zuschlag%). Pa zuschlag = EK (sjellja e mëparshme).
export function verkaufsPreis(artikel: ArtikelPreisInfo, konditionen: KonditionInfo[]): number {
  const ek = einkaufsPreis(artikel, konditionen);
  return Math.round(ek * (1 + (artikel.zuschlagProzent ?? 0) / 100) * 100) / 100;
}

// Marzha e fitimit në % të VK
export function marge(ek: number, vk: number): number {
  return vk > 0 ? Math.round(((vk - ek) / vk) * 1000) / 10 : 0;
}
