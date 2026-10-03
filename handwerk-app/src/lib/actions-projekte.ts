"use server";

// Server actions për Projekte (kantier) dhe Zeiterfassung (orë pune → rapport/faturë).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { vergibNummer } from "./nummern";

const emptyToNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};
const datumOderNull = (v: FormDataEntryValue | null) => {
  const s = emptyToNull(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

// "1:30", "1.5", "1,5" ose "90m" → minuta
function parseDauer(text: string): number {
  const t = text.trim().toLowerCase().replace(",", ".");
  let m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  m = t.match(/^(\d+)\s*m(in)?$/);
  if (m) return parseInt(m[1]);
  const h = parseFloat(t);
  return Number.isFinite(h) ? Math.round(h * 60) : 0;
}

// ---------- Projekte ----------

export async function createProjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/projekte?fehler=name");
  const kundeId = emptyToNull(formData.get("kundeId"));
  if (kundeId && !(await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } }))) {
    redirect("/projekte?fehler=kunde");
  }
  const nr = await vergibNummer(betrieb.id, "PROJEKT");
  const p = await db.projekt.create({
    data: {
      betriebId: betrieb.id,
      kundeId,
      ...nr,
      name,
      typ: kundeId ? "KUNDE" : "INTERN",
      status: "OFFEN",
      substatus: String(formData.get("substatus") ?? ""),
      start: datumOderNull(formData.get("start")),
      ende: datumOderNull(formData.get("ende")),
      beschreibung: String(formData.get("beschreibung") ?? ""),
    },
  });
  revalidatePath("/projekte");
  redirect(`/projekte/${p.id}`);
}

export async function updateProjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  await db.projekt.updateMany({
    where: { id, betriebId: betrieb.id },
    data: {
      name: String(formData.get("name") ?? "").trim() || undefined,
      status: ["OFFEN", "AKTIV", "ARCHIVIERT"].includes(status) ? status : undefined,
      substatus: String(formData.get("substatus") ?? ""),
      start: datumOderNull(formData.get("start")),
      ende: datumOderNull(formData.get("ende")),
      beschreibung: String(formData.get("beschreibung") ?? ""),
    },
  });
  revalidatePath(`/projekte/${id}`);
  revalidatePath("/projekte");
  redirect(`/projekte/${id}?gespeichert=1`);
}

export async function deleteProjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const id = String(formData.get("id"));
  const p = await db.projekt.findFirst({
    where: { id, betriebId: betrieb.id },
    include: { _count: { select: { auftraege: true, zeiten: true } } },
  });
  if (!p) redirect("/projekte");
  // Me dokumente/orë të lidhura nuk fshihet — arkivohet
  if (p._count.auftraege > 0 || p._count.zeiten > 0) {
    await db.projekt.update({ where: { id }, data: { status: "ARCHIVIERT" } });
    redirect(`/projekte/${id}?fehler=archiviert`);
  }
  await db.projekt.delete({ where: { id } });
  revalidatePath("/projekte");
  redirect("/projekte");
}

export async function auftragZuProjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const projektId = String(formData.get("projektId"));
  const auftragId = String(formData.get("auftragId") ?? "");
  const projekt = await db.projekt.findFirst({ where: { id: projektId, betriebId: betrieb.id } });
  if (!projekt) throw new Error("Projekt nicht gefunden");
  if (auftragId) {
    await db.auftrag.updateMany({
      where: { id: auftragId, betriebId: betrieb.id },
      data: { projektId },
    });
  }
  revalidatePath(`/projekte/${projektId}`);
}

export async function auftragVonProjekt(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const projektId = String(formData.get("projektId"));
  await db.auftrag.updateMany({
    where: { id: String(formData.get("auftragId")), betriebId: betrieb.id, projektId },
    data: { projektId: null },
  });
  revalidatePath(`/projekte/${projektId}`);
}

// ---------- Zeiterfassung ----------

export async function createZeit(formData: FormData) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich("PROJEKTE");
  const minuten = parseDauer(String(formData.get("dauer") ?? ""));
  if (minuten <= 0 || minuten > 24 * 60) redirect("/zeiten?fehler=dauer");

  const mitarbeiterId = String(formData.get("mitarbeiterId") || mitarbeiter.id);
  const ma = await db.mitarbeiter.findFirst({ where: { id: mitarbeiterId, betriebId: betrieb.id } });
  if (!ma) redirect("/zeiten?fehler=mitarbeiter");

  const projektId = emptyToNull(formData.get("projektId"));
  const auftragId = emptyToNull(formData.get("auftragId"));
  let kundeId = emptyToNull(formData.get("kundeId"));
  if (projektId) {
    const p = await db.projekt.findFirst({ where: { id: projektId, betriebId: betrieb.id } });
    if (!p) redirect("/zeiten?fehler=projekt");
    kundeId = kundeId ?? p.kundeId;
  }
  if (auftragId) {
    const a = await db.auftrag.findFirst({ where: { id: auftragId, betriebId: betrieb.id } });
    if (!a) redirect("/zeiten?fehler=auftrag");
    kundeId = kundeId ?? a.kundeId;
  }
  await db.zeiteintrag.create({
    data: {
      betriebId: betrieb.id,
      mitarbeiterId: ma.id,
      projektId,
      auftragId,
      kundeId,
      taetigkeit: String(formData.get("taetigkeit") ?? "Umsetzung"),
      datum: datumOderNull(formData.get("datum")) ?? new Date(),
      minuten,
      bemerkung: String(formData.get("bemerkung") ?? "").trim(),
      abrechenbar: formData.get("abrechenbar") === "1",
      stundensatz: ma.stundensatz, // tarifa e ngrirë në momentin e regjistrimit
    },
  });
  revalidatePath("/zeiten");
  redirect("/zeiten?gespeichert=1");
}

export async function setZeitStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  const status = String(formData.get("status"));
  if (!["OFFEN", "ERLEDIGT"].includes(status)) return;
  await db.zeiteintrag.updateMany({
    where: { id: String(formData.get("id")), betriebId: betrieb.id, status: { not: "FAKTURIERT" } },
    data: { status },
  });
  revalidatePath("/zeiten");
}

export async function deleteZeit(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("PROJEKTE");
  await db.zeiteintrag.deleteMany({
    where: { id: String(formData.get("id")), betriebId: betrieb.id, status: { not: "FAKTURIERT" } },
  });
  revalidatePath("/zeiten");
}

// Orët e abrechenbar të një Auftrag-u → një Rapport me pozicione ARBEIT (grupuar sipas Mitarbeiter+tarifë)
export async function zeitenInRapport(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const auftragId = String(formData.get("auftragId"));
  const auftrag = await db.auftrag.findFirst({ where: { id: auftragId, betriebId: betrieb.id } });
  if (!auftrag) throw new Error("Auftrag nicht gefunden");
  if (auftrag.status === "VERRECHNET") redirect(`/auftraege/${auftragId}?fehler=verrechnet`);

  const zeiten = await db.zeiteintrag.findMany({
    where: { auftragId, betriebId: betrieb.id, abrechenbar: true, status: { not: "FAKTURIERT" } },
    include: { mitarbeiter: true },
  });
  if (zeiten.length === 0) redirect(`/auftraege/${auftragId}?fehler=keine-zeiten`);

  const gruppen = new Map<string, { name: string; ansatz: number; minuten: number }>();
  for (const z of zeiten) {
    const key = `${z.mitarbeiterId}|${z.stundensatz}`;
    const g = gruppen.get(key) ?? { name: z.mitarbeiter.name, ansatz: z.stundensatz, minuten: 0 };
    g.minuten += z.minuten;
    gruppen.set(key, g);
  }
  await db.rapport.create({
    data: {
      auftragId,
      bemerkung: "Aus Zeiterfassung übernommen",
      positionen: {
        create: [...gruppen.values()].map((g) => ({
          typ: "ARBEIT",
          bezeichnung: `Arbeitszeit ${g.name}`,
          menge: Math.round((g.minuten / 60) * 100) / 100,
          einheit: "Std.",
          ansatz: g.ansatz,
        })),
      },
    },
  });
  await db.zeiteintrag.updateMany({
    where: { id: { in: zeiten.map((z) => z.id) } },
    data: { status: "FAKTURIERT" },
  });
  revalidatePath(`/auftraege/${auftragId}`);
  revalidatePath("/zeiten");
  redirect(`/auftraege/${auftragId}?zeiten=${zeiten.length}`);
}

// ---------- Stundensätze pro Mitarbeiter (Einstellungen) ----------

export async function saveStundensaetze(formData: FormData) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich("EINSTELLUNGEN");
  if (mitarbeiter.rolle !== "CHEF" && mitarbeiter.rolle !== "BUERO") redirect("/einstellungen?fehler=recht");
  const team = await db.mitarbeiter.findMany({ where: { betriebId: betrieb.id } });
  for (const m of team) {
    const satz = parseFloat(String(formData.get(`satz_${m.id}`) ?? "").replace(",", "."));
    if (Number.isFinite(satz) && satz >= 0 && satz < 1000) {
      await db.mitarbeiter.update({ where: { id: m.id }, data: { stundensatz: satz } });
    }
  }
  revalidatePath("/einstellungen");
  redirect("/einstellungen?gespeichert=1");
}
