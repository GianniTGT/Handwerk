// Afati i pagesës dhe «überfällig» për faturat (Debitoren) dhe shpenzimet (Kreditoren)

const TAG = 24 * 60 * 60 * 1000;

export function faelligDatum(r: { datum: Date; faelligAm: Date | null }, fristTage = 30): Date {
  return r.faelligAm ?? new Date(r.datum.getTime() + fristTage * TAG);
}

// Faturë e hapur = e dërguar, jo e paguar. Draft-et nuk numërohen si pritje pagese.
export function istUeberfaellig(faellig: Date, status: string, heute = new Date()): boolean {
  return status !== "BEZAHLT" && status !== "ENTWURF" && faellig.getTime() < startTag(heute);
}

export function tageUeberfaellig(faellig: Date, heute = new Date()): number {
  return Math.max(0, Math.floor((startTag(heute) - faellig.getTime()) / TAG));
}

function startTag(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
