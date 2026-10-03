"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { parseArtikelCsv } from "./csv";
import { verkaufsPreis } from "./preise";
import { offertePdf, rechnungPdf } from "./pdf";
import { sendeDokument } from "./email";
import { offerteNummer } from "./format";
import { vergibNummer } from "./nummern";
import { registrierungOffen } from "./registrierung";
import { clientIp, loescheFehlversuche, registriereFehlversuch, schluessel, sperreMinuten } from "./loginsperre";
import { plusMonate } from "./datum";
import {
  beendeSitzung,
  erstelleSitzung,
  hashPasswort,
  leseSitzung,
  pruefePasswort,
  sitzungErforderlich,
} from "./auth";

// Numra nga formularët: pa NaN/negativë (përndryshe Prisma/DB gabon ose ruan çmime absurde)
const zahl = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim().replace(",", "."));
const positiv = (v: FormDataEntryValue | null, fallback: number) => {
  const n = zahl(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const nichtNegativ = (v: FormDataEntryValue | null, fallback: number) => {
  const n = zahl(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// ---------- Auth ----------

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");

  // Anmeldesperre: pas shumë gabimeve (email ose IP) hyrja bllokohet përkohësisht
  const ip = await clientIp();
  const keys = schluessel(email, ip);
  const gesperrt = await sperreMinuten([keys.mail, keys.ip]);
  if (gesperrt > 0) redirect(`/login?fehler=gesperrt&min=${gesperrt}`);

  const mitarbeiter = await db.mitarbeiter.findUnique({ where: { email } });
  const passwortOk = await pruefePasswort(passwort, mitarbeiter?.passwortHash ?? "");
  if (!mitarbeiter || !mitarbeiter.aktiv || !passwortOk) {
    await registriereFehlversuch(email, ip);
    redirect("/login?fehler=1");
  }
  await loescheFehlversuche(email);
  await erstelleSitzung(mitarbeiter.id);
  redirect("/");
}

export async function logout() {
  await beendeSitzung();
  redirect("/login");
}

// Dropdown i firmës (si te bexio): lejohet vetëm Betrieb-i vetë ose qasjet shtesë
export async function wechselBetrieb(formData: FormData) {
  const sitzung = await leseSitzung();
  if (!sitzung) redirect("/login");
  const betriebId = String(formData.get("betriebId") ?? "");
  if (!sitzung.betriebe.some((b) => b.id === betriebId)) redirect("/");
  await db.sitzung.update({ where: { id: sitzung.id }, data: { aktiverBetriebId: betriebId } });
  redirect("/");
}

export async function registriereBetrieb(formData: FormData) {
  if (!registrierungOffen()) redirect("/registrieren");
  const firmenname = String(formData.get("firmenname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  if (!firmenname || !name || !email || passwort.length < 8) {
    redirect("/registrieren?fehler=eingabe");
  }
  const vorhanden = await db.mitarbeiter.findUnique({ where: { email } });
  if (vorhanden) redirect("/registrieren?fehler=email");

  const betrieb = await db.betrieb.create({ data: { name: firmenname } });
  const chef = await db.mitarbeiter.create({
    data: {
      betriebId: betrieb.id,
      name,
      email,
      rolle: "CHEF",
      passwortHash: await hashPasswort(passwort),
    },
  });
  await erstelleSitzung(chef.id);
  redirect("/");
}

// ---------- Kunden & Objekte ----------

export async function createKunde(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  await db.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: String(formData.get("name") ?? "").trim(),
      strasse: String(formData.get("strasse") ?? ""),
      plz: String(formData.get("plz") ?? ""),
      ort: String(formData.get("ort") ?? ""),
      telefon: String(formData.get("telefon") ?? ""),
      email: String(formData.get("email") ?? ""),
    },
  });
  revalidatePath("/kunden");
}

export async function createObjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } });
  if (!kunde) throw new Error("Kunde nicht gefunden");
  await db.objekt.create({
    data: {
      kundeId,
      bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
      strasse: String(formData.get("strasse") ?? ""),
      plz: String(formData.get("plz") ?? ""),
      ort: String(formData.get("ort") ?? ""),
      bemerkung: String(formData.get("bemerkung") ?? ""),
    },
  });
  revalidatePath(`/kunden/${kundeId}`);
}

// ---------- Aufträge & Rapporte ----------

export async function createAuftrag(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } });
  if (!kunde) throw new Error("Kunde nicht gefunden");

  const objektId = String(formData.get("objektId") ?? "");
  if (objektId) {
    // Objekt muss zu diesem Kontakt gehören (nicht nur zum Betrieb)
    const objekt = await db.objekt.findFirst({ where: { id: objektId, kundeId } });
    if (!objekt) throw new Error("Objekt nicht gefunden");
  }
  const projektRoh = String(formData.get("projektId") ?? "");
  const projekt = projektRoh
    ? await db.projekt.findFirst({ where: { id: projektRoh, betriebId: betrieb.id } })
    : null;

  const letzter = await db.auftrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const auftrag = await db.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId,
      objektId: objektId || null,
      projektId: projekt?.id ?? null,
      nummer: (letzter?.nummer ?? 1000) + 1,
      titel: String(formData.get("titel") ?? "").trim(),
      beschreibung: String(formData.get("beschreibung") ?? ""),
    },
  });
  redirect(`/auftraege/${auftrag.id}`);
}

async function eigenerAuftrag(auftragId: string, betriebId: string) {
  const auftrag = await db.auftrag.findFirst({ where: { id: auftragId, betriebId } });
  if (!auftrag) throw new Error("Auftrag nicht gefunden");
  return auftrag;
}

// Pas Schlussrechnung-it nuk lejohen ndryshime në rapport (dokumenti i faturuar mbetet i pandryshuar)
async function pasVerrechnung(auftragId: string) {
  const schluss = await db.rechnung.findFirst({ where: { auftragId, art: "SCHLUSS" }, select: { id: true } });
  if (schluss) redirect(`/auftraege/${auftragId}?fehler=verrechnet`);
}

async function rapportFuerAuftrag(auftragId: string) {
  const vorhanden = await db.rapport.findFirst({ where: { auftragId } });
  if (vorhanden) return vorhanden;
  return db.rapport.create({ data: { auftragId } });
}

export async function addRapportPosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);
  await pasVerrechnung(auftragId);
  const rapport = await rapportFuerAuftrag(auftragId);

  const artikelId = String(formData.get("artikelId") ?? "");
  let bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  let einheit = String(formData.get("einheit") ?? "Std.");
  let ansatz = nichtNegativ(formData.get("ansatz"), 0);
  if (artikelId) {
    const artikel = await db.artikel.findFirst({
      where: { id: artikelId, betriebId: betrieb.id },
    });
    if (artikel) {
      const konditionen = await db.kondition.findMany({ where: { betriebId: betrieb.id } });
      bezeichnung = bezeichnung || artikel.bezeichnung;
      einheit = artikel.einheit;
      ansatz = ansatz || verkaufsPreis(artikel, konditionen);
    }
  }

  await db.rapportPosition.create({
    data: {
      rapportId: rapport.id,
      typ: String(formData.get("typ")) === "MATERIAL" ? "MATERIAL" : "ARBEIT",
      bezeichnung,
      menge: positiv(formData.get("menge"), 1),
      einheit,
      ansatz,
    },
  });
  await db.auftrag.updateMany({ where: { id: auftragId, status: { not: "VERRECHNET" } }, data: { status: "IN_ARBEIT" } });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function deleteRapportPosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);
  await pasVerrechnung(auftragId);
  await db.rapportPosition.deleteMany({
    where: { id: String(formData.get("positionId")), rapport: { auftragId } },
  });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function saveRapportFoto(auftragId: string, dataUrl: string) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  await eigenerAuftrag(auftragId, betrieb.id);
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) || dataUrl.length > 2_000_000) {
    throw new Error("Ungültiges Foto (max. ~1.5 MB nach Komprimierung)");
  }
  const rapport = await rapportFuerAuftrag(auftragId);
  const anzahl = await db.rapportFoto.count({ where: { rapportId: rapport.id } });
  if (anzahl >= 20) throw new Error("Max. 20 Fotos pro Rapport");
  await db.rapportFoto.create({ data: { rapportId: rapport.id, daten: dataUrl } });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function deleteRapportFoto(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);
  await db.rapportFoto.deleteMany({
    where: { id: String(formData.get("fotoId")), rapport: { auftragId } },
  });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function saveUnterschrift(auftragId: string, dataUrl: string) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich("AUFTRAEGE");
  await eigenerAuftrag(auftragId, betrieb.id);
  if (!dataUrl.startsWith("data:image/png;base64,") || dataUrl.length > 500_000) {
    throw new Error("Ungültige Unterschrift");
  }
  const rapport = await rapportFuerAuftrag(auftragId);
  await db.rapport.update({
    where: { id: rapport.id },
    data: { unterschrift: dataUrl, mitarbeiterId: mitarbeiter.id },
  });
  // Auftrag-i i faturuar nuk kthehet prapa në «ERLEDIGT»
  await db.auftrag.updateMany({ where: { id: auftragId, status: { not: "VERRECHNET" } }, data: { status: "ERLEDIGT" } });
  revalidatePath(`/auftraege/${auftragId}`);
}

// ---------- Artikel, Lieferanten & Konditionen ----------

export async function createLieferant(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.lieferant.create({ data: { betriebId: betrieb.id, name } });
  revalidatePath("/artikel");
}

export async function setKondition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  const lieferantId = String(formData.get("lieferantId"));
  const lieferant = await db.lieferant.findFirst({
    where: { id: lieferantId, betriebId: betrieb.id },
  });
  if (!lieferant) throw new Error("Lieferant nicht gefunden");
  const rabattgruppe = String(formData.get("rabattgruppe") ?? "").trim();
  const rabattProzent = Number(formData.get("rabattProzent") ?? 0);
  if (rabattProzent < 0 || rabattProzent > 100) throw new Error("Rabatt 0–100%");
  await db.kondition.upsert({
    where: {
      betriebId_lieferantId_rabattgruppe: { betriebId: betrieb.id, lieferantId, rabattgruppe },
    },
    update: { rabattProzent },
    create: { betriebId: betrieb.id, lieferantId, rabattgruppe, rabattProzent },
  });
  revalidatePath("/artikel");
}

export async function deleteKondition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  await db.kondition.deleteMany({
    where: { id: String(formData.get("konditionId")), betriebId: betrieb.id },
  });
  revalidatePath("/artikel");
}

export async function importArtikelCsv(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  const lieferantId = String(formData.get("lieferantId") ?? "");
  const lieferant = lieferantId
    ? await db.lieferant.findFirst({ where: { id: lieferantId, betriebId: betrieb.id } })
    : null;
  if (lieferantId && !lieferant) throw new Error("Lieferant nicht gefunden");

  const datei = formData.get("datei");
  if (!(datei instanceof File) || datei.size === 0) {
    redirect("/artikel?import=fehler&grund=datei");
  }
  if (datei.size > 10 * 1024 * 1024) redirect("/artikel?import=fehler&grund=gross");

  const { zeilen, fehler } = parseArtikelCsv(await datei.text());
  if (zeilen.length === 0) redirect("/artikel?import=fehler&grund=leer");

  // Upsert sipas (betrieb, lieferant, artikelNr); pa ArtNr → krijohet gjithmonë i ri
  let neu = 0;
  let aktualisiert = 0;
  const mitNr = zeilen.filter((z) => z.artikelNr);
  const ohneNr = zeilen.filter((z) => !z.artikelNr);

  const vorhandene = mitNr.length
    ? await db.artikel.findMany({
        where: {
          betriebId: betrieb.id,
          lieferantId: lieferantId || null,
          artikelNr: { in: mitNr.map((z) => z.artikelNr) },
        },
        select: { id: true, artikelNr: true },
      })
    : [];
  const proNr = new Map(vorhandene.map((a) => [a.artikelNr, a.id]));

  const updates = [];
  const creates = [];
  for (const z of mitNr) {
    const daten = {
      bezeichnung: z.bezeichnung,
      einheit: z.einheit,
      bruttoPreis: z.bruttoPreis,
      rabattgruppe: z.rabattgruppe,
    };
    const id = proNr.get(z.artikelNr);
    if (id) {
      updates.push(db.artikel.update({ where: { id }, data: daten }));
      aktualisiert++;
    } else {
      creates.push({
        betriebId: betrieb.id,
        lieferantId: lieferantId || null,
        artikelNr: z.artikelNr,
        ...daten,
      });
      neu++;
    }
  }
  for (const z of ohneNr) {
    creates.push({
      betriebId: betrieb.id,
      lieferantId: lieferantId || null,
      artikelNr: "",
      bezeichnung: z.bezeichnung,
      einheit: z.einheit,
      bruttoPreis: z.bruttoPreis,
      rabattgruppe: z.rabattgruppe,
    });
    neu++;
  }

  await db.$transaction([
    ...(creates.length ? [db.artikel.createMany({ data: creates })] : []),
    ...updates,
  ]);

  revalidatePath("/artikel");
  redirect(
    `/artikel?import=ok&neu=${neu}&aktualisiert=${aktualisiert}&uebersprungen=${fehler.length}`
  );
}

export async function deleteArtikel(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  await db.artikel.deleteMany({
    where: { id: String(formData.get("artikelId")), betriebId: betrieb.id },
  });
  revalidatePath("/artikel");
}

// ---------- Offerten ----------

export async function createOfferte(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } });
  if (!kunde) throw new Error("Kunde nicht gefunden");

  const objektId = String(formData.get("objektId") ?? "");
  if (objektId) {
    const objekt = await db.objekt.findFirst({ where: { id: objektId, kundeId } });
    if (!objekt) throw new Error("Objekt nicht gefunden");
  }

  const gueltigBisRoh = String(formData.get("gueltigBis") ?? "");
  const gueltigBis = gueltigBisRoh
    ? new Date(gueltigBisRoh)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const nr = await vergibNummer(betrieb.id, "OFFERTE");
  const offerte = await db.offerte.create({
    data: {
      betriebId: betrieb.id,
      kundeId,
      objektId: objektId || null,
      ...nr,
      titel: String(formData.get("titel") ?? "").trim(),
      gueltigBis,
      gruppen: { create: [{ titel: "Leistungen", reihenfolge: 0 }] },
    },
  });
  redirect(`/offerten/${offerte.id}`);
}

async function eigeneOfferte(offerteId: string, betriebId: string) {
  const offerte = await db.offerte.findFirst({ where: { id: offerteId, betriebId } });
  if (!offerte) throw new Error("Offerte nicht gefunden");
  return offerte;
}

export async function addOfferteGruppe(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  await eigeneOfferte(offerteId, betrieb.id);
  const anzahl = await db.offerteGruppe.count({ where: { offerteId } });
  await db.offerteGruppe.create({
    data: {
      offerteId,
      titel: String(formData.get("titel") ?? "").trim() || `Gruppe ${anzahl + 1}`,
      reihenfolge: anzahl,
    },
  });
  revalidatePath(`/offerten/${offerteId}`);
}

export async function deleteOfferteGruppe(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  await eigeneOfferte(offerteId, betrieb.id);
  await db.offerteGruppe.deleteMany({
    where: { id: String(formData.get("gruppeId")), offerteId },
  });
  revalidatePath(`/offerten/${offerteId}`);
}

export async function addOffertePosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const gruppeId = String(formData.get("gruppeId"));
  const gruppe = await db.offerteGruppe.findFirst({
    where: { id: gruppeId, offerte: { betriebId: betrieb.id } },
    include: { offerte: true },
  });
  if (!gruppe) throw new Error("Gruppe nicht gefunden");

  const artikelId = String(formData.get("artikelId") ?? "");
  let bezeichnung = String(formData.get("bezeichnung") ?? "").replace(/\r/g, "").trim();
  let einheit = String(formData.get("einheit") ?? "Stk.");
  let ansatz = nichtNegativ(formData.get("ansatz"), 0);
  if (artikelId) {
    const artikel = await db.artikel.findFirst({
      where: { id: artikelId, betriebId: betrieb.id },
    });
    if (artikel) {
      const konditionen = await db.kondition.findMany({ where: { betriebId: betrieb.id } });
      bezeichnung = bezeichnung || artikel.bezeichnung;
      einheit = artikel.einheit;
      ansatz = ansatz || verkaufsPreis(artikel, konditionen);
    }
  }

  const anzahl = await db.offertePosition.count({ where: { gruppeId } });
  await db.offertePosition.create({
    data: {
      gruppeId,
      reihenfolge: anzahl,
      bezeichnung,
      menge: positiv(formData.get("menge"), 1),
      einheit,
      ansatz,
    },
  });
  revalidatePath(`/offerten/${gruppe.offerteId}`);
}

export async function deleteOffertePosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  await eigeneOfferte(offerteId, betrieb.id);
  await db.offertePosition.deleteMany({
    where: { id: String(formData.get("positionId")), gruppe: { offerteId } },
  });
  revalidatePath(`/offerten/${offerteId}`);
}

export async function setOfferteStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  await eigeneOfferte(offerteId, betrieb.id);
  const status = String(formData.get("status"));
  if (!["ENTWURF", "GESENDET", "ANGENOMMEN", "ABGELEHNT"].includes(status)) return;
  await db.offerte.update({ where: { id: offerteId }, data: { status } });
  revalidatePath(`/offerten/${offerteId}`);
}

// Konvertimi Offerte → Auftrag: pozicionet e grupeve kopjohen të sheshta në rapport
export async function konvertiereOfferte(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  const offerte = await db.offerte.findFirst({
    where: { id: offerteId, betriebId: betrieb.id },
    include: { gruppen: { include: { positionen: true }, orderBy: { reihenfolge: "asc" } } },
  });
  if (!offerte) throw new Error("Offerte nicht gefunden");
  if (offerte.auftragId) redirect(`/auftraege/${offerte.auftragId}`);

  const letzter = await db.auftrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const auftrag = await db.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId: offerte.kundeId,
      objektId: offerte.objektId,
      nummer: (letzter?.nummer ?? 1000) + 1,
      titel: offerte.titel,
      beschreibung: `Aus Offerte ${offerteNummer(offerte)}`,
      status: "OFFEN",
      rapporte: {
        create: [
          {
            positionen: {
              create: offerte.gruppen.flatMap((g) =>
                g.positionen.map((p) => ({
                  typ: /^(h|std)/i.test(p.einheit) ? "ARBEIT" : "MATERIAL",
                  bezeichnung: p.bezeichnung.split("\n")[0],
                  menge: p.menge,
                  einheit: p.einheit,
                  ansatz: p.ansatz,
                }))
              ),
            },
          },
        ],
      },
    },
  });
  await db.offerte.update({
    where: { id: offerte.id },
    data: { auftragId: auftrag.id, status: "ANGENOMMEN" },
  });
  redirect(`/auftraege/${auftrag.id}`);
}

export async function deleteKunde(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({
    where: { id: kundeId, betriebId: betrieb.id },
    include: { _count: { select: { auftraege: true, offerten: true, projekte: true, zeiten: true, wartungsvertraege: true } } },
  });
  if (!kunde) throw new Error("Kunde nicht gefunden");
  // Mbrojtje: klientë me dokumente (auftrage/oferta/fatura) NUK fshihen —
  // dokumentet janë regjistrime biznesi që duhen ruajtur
  if (
    kunde._count.auftraege > 0 ||
    kunde._count.offerten > 0 ||
    kunde._count.projekte > 0 ||
    kunde._count.zeiten > 0 ||
    kunde._count.wartungsvertraege > 0
  ) {
    redirect(`/kunden/${kundeId}?fehler=hat-dokumente`);
  }
  await db.objekt.deleteMany({ where: { kundeId } });
  await db.kunde.delete({ where: { id: kundeId } });
  redirect("/kunden");
}

export async function deleteObjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const objekt = await db.objekt.findFirst({
    where: { id: String(formData.get("objektId")), kunde: { betriebId: betrieb.id } },
    include: { _count: { select: { auftraege: true, offerten: true } } },
  });
  if (!objekt) throw new Error("Objekt nicht gefunden");
  if (objekt._count.auftraege > 0 || objekt._count.offerten > 0) {
    redirect(`/kunden/${objekt.kundeId}?fehler=objekt-hat-dokumente`);
  }
  await db.objekt.delete({ where: { id: objekt.id } });
  revalidatePath(`/kunden/${objekt.kundeId}`);
}

// ---------- Einstellungen / Dokumenten-Designer ----------

export async function updateBetrieb(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("EINSTELLUNGEN");
  const hex = (name: string, fallback: string) => {
    const wert = String(formData.get(name) ?? "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(wert) ? wert : fallback;
  };

  const tage = (name: string, fallback: number) => {
    const n = parseInt(String(formData.get(name) ?? ""));
    return Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : fallback;
  };

  // Logo opsionale: PNG/JPEG deri 500 KB, ruhet si data-URL
  let logo: string | undefined;
  const datei = formData.get("logo");
  if (datei instanceof File && datei.size > 0) {
    if (datei.size > 500 * 1024) redirect("/einstellungen?fehler=logo-gross");
    if (!["image/png", "image/jpeg"].includes(datei.type)) {
      redirect("/einstellungen?fehler=logo-format");
    }
    const bytes = Buffer.from(await datei.arrayBuffer());
    logo = `data:${datei.type};base64,${bytes.toString("base64")}`;
  }
  if (formData.get("logoEntfernen") === "1") logo = "";

  // IBAN (QR-Rechnung): vetëm CH/LI, 21 karaktere — përndryshe PDF-ja e faturës nuk gjenerohet
  const ibanRoh = String(formData.get("iban") ?? "").replace(/\s/g, "").toUpperCase();
  if (ibanRoh && !/^(CH|LI)\d{2}[0-9A-Z]{17}$/.test(ibanRoh)) redirect("/einstellungen?fehler=iban");

  await db.betrieb.update({
    where: { id: betrieb.id },
    data: {
      name: String(formData.get("name") ?? betrieb.name).trim() || betrieb.name,
      strasse: String(formData.get("strasse") ?? ""),
      plz: String(formData.get("plz") ?? ""),
      ort: String(formData.get("ort") ?? ""),
      telefon: String(formData.get("telefon") ?? ""),
      email: String(formData.get("email") ?? ""),
      iban: ibanRoh,
      bank: String(formData.get("bank") ?? ""),
      bic: String(formData.get("bic") ?? ""),
      zahlungsfristTage: Math.min(365, Math.max(0, parseInt(String(formData.get("zahlungsfristTage") ?? "")) || betrieb.zahlungsfristTage)),
      mwstNr: String(formData.get("mwstNr") ?? ""),
      mahnfrist1Tage: tage("mahnfrist1Tage", betrieb.mahnfrist1Tage),
      mahnfrist2Tage: tage("mahnfrist2Tage", betrieb.mahnfrist2Tage),
      mahnfrist3Tage: tage("mahnfrist3Tage", betrieb.mahnfrist3Tage),
      rechnungKopftext: String(formData.get("rechnungKopftext") ?? "").trim(),
      rechnungFusstext: String(formData.get("rechnungFusstext") ?? "").trim(),
      offerteKopftext: String(formData.get("offerteKopftext") ?? "").trim(),
      offerteFusstext: String(formData.get("offerteFusstext") ?? "").trim(),
      farbeTitel: hex("farbeTitel", betrieb.farbeTitel),
      farbeLinien: hex("farbeLinien", betrieb.farbeLinien),
      farbeText: hex("farbeText", betrieb.farbeText),
      ...(logo !== undefined ? { logo } : {}),
    },
  });
  revalidatePath("/einstellungen");
  redirect("/einstellungen?gespeichert=1");
}

// ---------- E-Mail-Versand ----------

async function sendeDokumentEmail(args: {
  typ: "offerte" | "rechnung";
  dokumentId: string;
  an: string;
  betreff: string;
  text: string;
  betrieb: { id: string; name: string; email: string };
  zurueck: string;
}) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.an)) {
    redirect(`${args.zurueck}?email=ungueltig`);
  }
  let pdf;
  try {
    pdf =
      args.typ === "offerte"
        ? await offertePdf(args.dokumentId, args.betrieb.id)
        : await rechnungPdf(args.dokumentId, args.betrieb.id);
  } catch {
    // p.sh. IBAN mungon → QR-Rechnung nuk gjenerohet; mos ktheje faqe gabimi 500
    redirect(`${args.zurueck}?email=pdf-fehler`);
  }
  if (!pdf) throw new Error("Dokument nicht gefunden");

  const ergebnis = await sendeDokument({
    an: args.an,
    antwortAn: args.betrieb.email,
    absenderName: args.betrieb.name,
    betreff: args.betreff,
    text: args.text,
    anhang: { dateiname: pdf.dateiname, buffer: pdf.buffer },
  });
  if (!ergebnis.ok) redirect(`${args.zurueck}?email=fehler`);

  if (args.typ === "offerte") {
    await db.offerte.updateMany({
      where: { id: args.dokumentId, betriebId: args.betrieb.id, status: "ENTWURF" },
      data: { status: "GESENDET" },
    });
  } else {
    await db.rechnung.updateMany({
      where: { id: args.dokumentId, betriebId: args.betrieb.id, status: "ENTWURF" },
      data: { status: "VERSENDET" },
    });
  }
  revalidatePath(args.zurueck);
  redirect(`${args.zurueck}?email=${ergebnis.simuliert ? "simuliert" : "ok"}`);
}

export async function sendeOfferteEmail(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const offerteId = String(formData.get("offerteId"));
  await eigeneOfferte(offerteId, betrieb.id);
  await sendeDokumentEmail({
    typ: "offerte",
    dokumentId: offerteId,
    an: String(formData.get("an") ?? "").trim(),
    betreff: String(formData.get("betreff") ?? "").trim(),
    text: String(formData.get("text") ?? "").replace(/\r/g, ""),
    betrieb,
    zurueck: `/offerten/${offerteId}`,
  });
}

export async function sendeRechnungEmail(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const rechnungId = String(formData.get("rechnungId"));
  const rechnung = await db.rechnung.findFirst({
    where: { id: rechnungId, betriebId: betrieb.id },
  });
  if (!rechnung) throw new Error("Rechnung nicht gefunden");
  await sendeDokumentEmail({
    typ: "rechnung",
    dokumentId: rechnungId,
    an: String(formData.get("an") ?? "").trim(),
    betreff: String(formData.get("betreff") ?? "").trim(),
    text: String(formData.get("text") ?? "").replace(/\r/g, ""),
    betrieb,
    // Rücksprung nur auf die eigene Rechnung (kein offener Redirect)
    zurueck: String(formData.get("rueck") ?? "") === `/rechnungen/${rechnungId}` ? `/rechnungen/${rechnungId}` : "/rechnungen",
  });
}

// ---------- Wartungsverträge ----------

export async function createWartungsvertrag(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const objektId = String(formData.get("objektId"));
  const objekt = await db.objekt.findFirst({
    where: { id: objektId, kunde: { betriebId: betrieb.id } },
    include: { kunde: true },
  });
  if (!objekt) throw new Error("Objekt nicht gefunden");

  const naechsteRoh = String(formData.get("naechsteWartung") ?? "");
  const letzter = await db.wartungsvertrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  await db.wartungsvertrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId: objekt.kundeId,
      objektId,
      nummer: (letzter?.nummer ?? 0) + 1,
      titel: String(formData.get("titel") ?? "").trim() || "Jahreswartung Heizung",
      intervallMonate: Math.max(1, Number(formData.get("intervallMonate") ?? 12)),
      naechsteWartung: naechsteRoh ? new Date(naechsteRoh) : new Date(),
      preis: Number(formData.get("preis") ?? 0),
      bemerkung: String(formData.get("bemerkung") ?? ""),
    },
  });
  revalidatePath("/wartung");
}

export async function setWartungsvertragStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const status = String(formData.get("status"));
  if (!["AKTIV", "PAUSIERT", "GEKUENDIGT"].includes(status)) return;
  await db.wartungsvertrag.updateMany({
    where: { id: String(formData.get("vertragId")), betriebId: betrieb.id },
    data: { status },
  });
  revalidatePath("/wartung");
}

export async function deleteWartungsvertrag(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  await db.wartungsvertrag.deleteMany({
    where: { id: String(formData.get("vertragId")), betriebId: betrieb.id, status: "GEKUENDIGT" },
  });
  revalidatePath("/wartung");
}

// Një klik: nga kontrata e radhës → Auftrag-u i servisit; data e ardhshme
// e mirëmbajtjes shtyhet automatikisht me intervalin
export async function wartungAuftragErstellen(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const vertrag = await db.wartungsvertrag.findFirst({
    where: { id: String(formData.get("vertragId")), betriebId: betrieb.id },
    include: { objekt: true },
  });
  if (!vertrag) throw new Error("Vertrag nicht gefunden");

  const letzter = await db.auftrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const auftrag = await db.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId: vertrag.kundeId,
      objektId: vertrag.objektId,
      nummer: (letzter?.nummer ?? 1000) + 1,
      titel: `${vertrag.titel} — ${vertrag.objekt.bezeichnung}`,
      beschreibung:
        `Aus Wartungsvertrag WV-${vertrag.nummer}` +
        (vertrag.preis > 0 ? ` · vereinbarter Preis: CHF ${vertrag.preis.toFixed(2)}` : "") +
        (vertrag.bemerkung ? ` · ${vertrag.bemerkung}` : ""),
      status: "OFFEN",
    },
  });

  const naechste = plusMonate(vertrag.naechsteWartung, vertrag.intervallMonate);
  await db.wartungsvertrag.update({
    where: { id: vertrag.id },
    data: { naechsteWartung: naechste },
  });
  redirect(`/auftraege/${auftrag.id}`);
}

// ---------- Rechnungen ----------

const runde5 = (n: number) => Math.round(n * 20) / 20; // rrumbullakim 5 Rappen
const MWST_STANDARD = 8.1;

// Schlussrechnung: të gjitha pozicionet e rapporteve minus Teilrechnung-et (Akonto) e dhëna më parë
export async function createRechnung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);

  const vorhanden = await db.rechnung.findFirst({ where: { auftragId, art: "SCHLUSS" } });
  if (vorhanden) redirect(`/rechnungen`);

  const [positionen, teile] = await Promise.all([
    db.rapportPosition.findMany({ where: { rapport: { auftragId } } }),
    db.rechnung.findMany({ where: { auftragId, art: "TEIL" } }),
  ]);
  const summePositionen = positionen.reduce((sum, p) => sum + p.menge * p.ansatz, 0);
  const abzugNetto = teile.reduce((sum, t) => sum + t.totalNetto, 0);
  const totalNetto = Math.round((summePositionen - abzugNetto) * 100) / 100;
  if (totalNetto < 0) redirect(`/auftraege/${auftragId}?fehler=akonto-zu-hoch`);

  const nr = await vergibNummer(betrieb.id, "RECHNUNG");
  const neu = await db.rechnung.create({
    data: {
      betriebId: betrieb.id,
      auftragId,
      ...nr,
      art: "SCHLUSS",
      abzugNetto,
      faelligAm: new Date(Date.now() + betrieb.zahlungsfristTage * 24 * 60 * 60 * 1000),
      totalNetto,
      mwstSatz: MWST_STANDARD,
      totalBrutto: runde5(totalNetto * (1 + MWST_STANDARD / 100)),
    },
  });
  await db.auftrag.update({ where: { id: auftragId }, data: { status: "VERRECHNET" } });
  redirect(`/rechnungen/${neu.id}`);
}

// Teilrechnung / Akonto: shumë fikse ose % e vlerës së Auftrag-ut (oferta, ndryshe rapportet)
export async function createTeilrechnung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);

  const auftrag = await db.auftrag.findUniqueOrThrow({
    where: { id: auftragId },
    include: {
      offerte: { include: { gruppen: { include: { positionen: true } } } },
      rapporte: { include: { positionen: true } },
    },
  });
  if (auftrag.status === "VERRECHNET") redirect(`/auftraege/${auftragId}?fehler=verrechnet`);

  const offertenWert =
    auftrag.offerte?.gruppen.flatMap((g) => g.positionen).reduce((sum, p) => sum + p.menge * p.ansatz, 0) ?? 0;
  const rapportWert = auftrag.rapporte.flatMap((r) => r.positionen).reduce((sum, p) => sum + p.menge * p.ansatz, 0);
  const auftragswert = offertenWert > 0 ? offertenWert : rapportWert;

  const prozent = parseFloat(String(formData.get("prozent") ?? "").replace(",", "."));
  const betragEingabe = parseFloat(String(formData.get("betragNetto") ?? "").replace(",", "."));
  let netto = 0;
  if (Number.isFinite(betragEingabe) && betragEingabe > 0) netto = betragEingabe;
  else if (Number.isFinite(prozent) && prozent > 0 && auftragswert > 0) netto = (auftragswert * prozent) / 100;
  netto = Math.round(netto * 100) / 100;
  if (netto <= 0) redirect(`/auftraege/${auftragId}?fehler=akonto-betrag`);

  const bisher = await db.rechnung.aggregate({ where: { auftragId, art: "TEIL" }, _sum: { totalNetto: true } });
  if (auftragswert > 0 && netto + (bisher._sum.totalNetto ?? 0) > auftragswert + 0.005) {
    redirect(`/auftraege/${auftragId}?fehler=akonto-zu-hoch`);
  }

  const nr = await vergibNummer(betrieb.id, "RECHNUNG");
  const teil = await db.rechnung.create({
    data: {
      betriebId: betrieb.id,
      auftragId,
      ...nr,
      art: "TEIL",
      bezeichnung:
        String(formData.get("bezeichnung") ?? "").trim() ||
        (prozent > 0 && !(betragEingabe > 0) ? `Akonto ${prozent}%` : "Akonto"),
      faelligAm: new Date(Date.now() + betrieb.zahlungsfristTage * 24 * 60 * 60 * 1000),
      totalNetto: netto,
      mwstSatz: MWST_STANDARD,
      totalBrutto: runde5(netto * (1 + MWST_STANDARD / 100)),
    },
  });
  revalidatePath(`/auftraege/${auftragId}`);
  redirect(`/rechnungen/${teil.id}`);
}

export async function setRechnungStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  await db.rechnung.updateMany({
    where: { id: String(formData.get("rechnungId")), betriebId: betrieb.id },
    data: { status: ["ENTWURF", "VERSENDET", "BEZAHLT"].includes(String(formData.get("status"))) ? String(formData.get("status")) : undefined },
  });
  revalidatePath("/rechnungen");
  revalidatePath("/rechnungen/[id]", "page");
}

export async function saveArtikel(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  const zahl = (n: string) => {
    const v = parseFloat(String(formData.get(n) ?? "").replace(",", "."));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) redirect("/artikel?fehler=bezeichnung");

  const ek = zahl("einkaufspreis");
  const vkEingabe = zahl("verkaufspreis");
  let zuschlag = zahl("zuschlagProzent");
  // EK + VK gegeben → Zuschlag daraus ableiten (wie bei bexio: Preise stehen in Beziehung)
  if (ek > 0 && vkEingabe > 0) zuschlag = Math.round((vkEingabe / ek - 1) * 10000) / 100;
  const preis = ek > 0 ? ek : vkEingabe;

  const lieferantId = String(formData.get("lieferantId") ?? "");
  if (lieferantId && !(await db.lieferant.findFirst({ where: { id: lieferantId, betriebId: betrieb.id } }))) {
    throw new Error("Lieferant nicht gefunden");
  }
  const daten = {
    bezeichnung,
    artikelNr: String(formData.get("artikelNr") ?? "").trim(),
    einheit: String(formData.get("einheit") ?? "").trim() || "Stk.",
    art: String(formData.get("art")) === "DIENSTLEISTUNG" ? "DIENSTLEISTUNG" : "WARE",
    gruppe: String(formData.get("gruppe") ?? "").trim(),
    einkaufspreis: ek,
    zuschlagProzent: ek > 0 || lieferantId ? zuschlag : 0,
    preis,
    mwstSatz: parseFloat(String(formData.get("mwstSatz") ?? "8.1")) || 0,
    lieferantId: lieferantId || null,
  };
  const id = String(formData.get("artikelId") ?? "");
  if (id) {
    await db.artikel.updateMany({ where: { id, betriebId: betrieb.id }, data: daten });
  } else {
    await db.artikel.create({ data: { ...daten, betriebId: betrieb.id } });
  }
  revalidatePath("/artikel");
  redirect("/artikel?gespeichert=1");
}
