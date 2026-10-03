// Vendosja e numrit të radhës sipas Nummernkreis-it të firmës (si te bexio)
import { db } from "./db";
import { NR_STANDARD, formatNr, type NrTyp } from "./nrtext";

async function maxBestehend(betriebId: string, typ: NrTyp): Promise<number> {
  const where = { betriebId };
  const agg =
    typ === "OFFERTE"
      ? await db.offerte.aggregate({ where, _max: { nummer: true } })
      : typ === "RECHNUNG"
        ? await db.rechnung.aggregate({ where, _max: { nummer: true } })
        : typ === "GUTSCHRIFT"
          ? await db.gutschrift.aggregate({ where, _max: { nummer: true } })
          : typ === "BESTELLUNG"
            ? await db.bestellung.aggregate({ where, _max: { nummer: true } })
            : typ === "LIEFERSCHEIN"
              ? await db.lieferschein.aggregate({ where, _max: { nummer: true } })
              : await db.projekt.aggregate({ where, _max: { nummer: true } });
  return agg._max.nummer ?? 0;
}

export async function holeKreis(betriebId: string, typ: NrTyp) {
  const vorhanden = await db.nummernkreis.findUnique({ where: { betriebId_typ: { betriebId, typ } } });
  if (vorhanden) return vorhanden;
  const std = NR_STANDARD[typ];
  const max = await maxBestehend(betriebId, typ);
  try {
    return await db.nummernkreis.create({
      data: {
        betriebId,
        typ,
        format: std.format,
        laenge: std.laenge,
        naechste: Math.max(max + 1, std.start),
        startNummer: std.start,
        jahr: new Date().getFullYear(),
      },
    });
  } catch {
    // garë: dikush e krijoi njëkohësisht
    return db.nummernkreis.findUniqueOrThrow({ where: { betriebId_typ: { betriebId, typ } } });
  }
}

// Kthen numrin (Int për renditje) dhe tekstin e formatuar; rritet numëruesi
export async function vergibNummer(betriebId: string, typ: NrTyp, datum = new Date()) {
  const kreis = await holeKreis(betriebId, typ);
  const jahr = datum.getFullYear();
  const reset = kreis.jaehrlichNeu && kreis.jahr !== 0 && kreis.jahr !== jahr;
  let nr: number;
  if (reset) {
    nr = kreis.startNummer;
    await db.nummernkreis.update({ where: { id: kreis.id }, data: { naechste: nr + 1, jahr } });
  } else {
    // increment atomik në DB: dy krijime të njëkohshme nuk marrin kurrë të njëjtin numër
    const neu = await db.nummernkreis.update({
      where: { id: kreis.id },
      data: { naechste: { increment: 1 }, jahr },
    });
    nr = neu.naechste - 1;
  }
  return { nummer: nr, nummerText: formatNr(kreis.format, nr, kreis.laenge, datum) };
}
