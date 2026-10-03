"use server";

// Eigenes Passwort ändern (jeder angemeldete Benutzer)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { beendeAndereSitzungen, hashPasswort, pruefePasswort, sitzungErforderlich } from "./auth";
import { clientIp, loescheFehlversuche, registriereFehlversuch, schluessel, sperreMinuten } from "./loginsperre";

export async function aendereEigenesPasswort(formData: FormData) {
  const { mitarbeiter } = await sitzungErforderlich();
  const aktuell = String(formData.get("aktuell") ?? "");
  const neu = String(formData.get("neu") ?? "");
  const wiederholung = String(formData.get("wiederholung") ?? "");
  const email = (mitarbeiter.email ?? mitarbeiter.id).toLowerCase();

  // Dieselbe Sperre wie beim Login (verhindert Raten des alten Passworts über eine gekaperte Sitzung)
  const ip = await clientIp();
  const keys = schluessel(email, ip);
  const gesperrt = await sperreMinuten([keys.mail, keys.ip]);
  if (gesperrt > 0) redirect(`/profil?fehler=gesperrt&min=${gesperrt}`);

  if (!(await pruefePasswort(aktuell, mitarbeiter.passwortHash))) {
    await registriereFehlversuch(email, ip);
    redirect("/profil?fehler=aktuell");
  }
  if (neu.length < 8) redirect("/profil?fehler=kurz");
  if (neu !== wiederholung) redirect("/profil?fehler=wiederholung");
  if (neu === aktuell) redirect("/profil?fehler=gleich");
  if (mitarbeiter.email && neu.toLowerCase() === mitarbeiter.email.toLowerCase()) redirect("/profil?fehler=email");

  await db.mitarbeiter.update({
    where: { id: mitarbeiter.id },
    data: { passwortHash: await hashPasswort(neu), passwortAendern: false },
  });
  await loescheFehlversuche(email);
  await beendeAndereSitzungen(mitarbeiter.id);
  redirect("/profil?gespeichert=1");
}

// Eigenen Anzeigenamen ändern (E-Mail/Login ändert der Administrator, damit Konten nicht übernommen werden können)
export async function aendereProfil(formData: FormData) {
  const { mitarbeiter } = await sitzungErforderlich();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/profil?fehler=name");
  await db.mitarbeiter.update({ where: { id: mitarbeiter.id }, data: { name } });
  revalidatePath("/", "layout");
  redirect("/profil?profil=1");
}

// Profilbild speichern: kommt als data-URL (JPEG/PNG), clientseitig bereits auf 256 px verkleinert; Grenze 300 KB
export async function speichereProfilFoto(dataUrl: string) {
  const { mitarbeiter } = await sitzungErforderlich();
  if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 300_000) {
    throw new Error("Ungültiges Bild");
  }
  await db.mitarbeiter.update({ where: { id: mitarbeiter.id }, data: { foto: dataUrl } });
  revalidatePath("/", "layout");
}

export async function loescheProfilFoto() {
  const { mitarbeiter } = await sitzungErforderlich();
  await db.mitarbeiter.update({ where: { id: mitarbeiter.id }, data: { foto: "" } });
  revalidatePath("/", "layout");
  redirect("/profil?profil=1");
}
