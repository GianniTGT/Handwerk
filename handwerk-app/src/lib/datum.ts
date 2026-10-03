// Datum si tekst JJJJ-MM-TT sipas orës LOKALE (toISOString() jep UTC dhe në Zvicër zhvendos një ditë mbrapa
// për data të krijuara në mesnatën lokale, ose para orës 02:00)
export function lokalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Muaj-shtim në UTC: data nga formularët ruhen si mesnatë UTC; setMonth lokal do t'i zhvendoste në kufirin e orës verore
export function plusMonate(d: Date, monate: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + monate);
  return r;
}
