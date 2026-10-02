// Llogaritja e çmimit neto të një artikulli për firmën:
// - artikull katalogu (me furnitor + çmim bruto): neto = brutto × (1 − rabatt%)
//   sipas Kondition-it të firmës për (furnitor, rabattgruppe); pa kondition → brutto
// - artikull manual: çmimi i futur direkt (preis)

type ArtikelPreisInfo = {
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
