// Radha offline (vetëm në klient): fotot dhe nënshkrimet e bëra pa rrjet
// ruhen në localStorage dhe sinkronizohen vetë kur kthehet lidhja.
export type OfflineEintrag = {
  typ: "foto" | "unterschrift";
  auftragId: string;
  dataUrl: string;
  ts: number;
};

const KEY = "handwerk-offline-queue";

export function leseQueue(): OfflineEintrag[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueue(eintrag: Omit<OfflineEintrag, "ts">): boolean {
  try {
    const queue = leseQueue();
    if (queue.length >= 30) return false; // mbrojtje nga mbushja e localStorage
    queue.push({ ...eintrag, ts: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("handwerk-queue-geaendert"));
    return true;
  } catch {
    return false; // localStorage plot (fotot janë të mëdha)
  }
}

export async function flushQueue(handlers: {
  foto: (auftragId: string, dataUrl: string) => Promise<void>;
  unterschrift: (auftragId: string, dataUrl: string) => Promise<void>;
}): Promise<number> {
  let erfolgreich = 0;
  let queue = leseQueue();
  while (queue.length > 0) {
    const eintrag = queue[0];
    try {
      await handlers[eintrag.typ](eintrag.auftragId, eintrag.dataUrl);
      queue = queue.slice(1);
      localStorage.setItem(KEY, JSON.stringify(queue));
      erfolgreich++;
    } catch {
      break; // ende offline ose gabim serveri — provohet më vonë
    }
  }
  window.dispatchEvent(new Event("handwerk-queue-geaendert"));
  return erfolgreich;
}
