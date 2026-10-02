"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushQueue, leseQueue } from "@/lib/offlineQueue";
import { saveRapportFoto, saveUnterschrift } from "@/lib/actions";

// Regjistron Service Worker-in, tregon gjendjen offline dhe sinkronizon
// radhën e fotove/nënshkrimeve kur kthehet rrjeti.
export default function PwaSetup() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [wartend, setWartend] = useState(0);
  const [sync, setSync] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // Dev: SW-i cache-first mbi /_next/static prish HMR — çregjistro dhe pastro cache
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
        caches?.keys().then((ks) => ks.filter((k) => k.startsWith("handwerk-")).forEach((k) => caches.delete(k)));
      }
    }

    const aktualisiereQueue = () => setWartend(leseQueue().length);
    aktualisiereQueue();

    const synchronisiere = async () => {
      if (leseQueue().length === 0) return;
      setSync("Synchronisiere…");
      const n = await flushQueue({ foto: saveRapportFoto, unterschrift: saveUnterschrift });
      setSync("");
      if (n > 0) {
        setWartend(leseQueue().length);
        router.refresh();
      }
    };

    const online = () => {
      setOffline(false);
      void synchronisiere();
    };
    const offlineHandler = () => setOffline(true);

    setOffline(!navigator.onLine);
    if (navigator.onLine) void synchronisiere();

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("handwerk-queue-geaendert", aktualisiereQueue);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("handwerk-queue-geaendert", aktualisiereQueue);
    };
  }, [router]);

  if (!offline && wartend === 0 && !sync) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 px-4 py-2 text-center text-sm font-medium text-white ${
        offline ? "bg-amber-600" : "bg-forest"
      }`}
    >
      {offline
        ? `📡 Offline — Sie können weiterarbeiten. ${wartend > 0 ? `${wartend} Änderung(en) warten auf Synchronisation.` : "Fotos & Unterschriften werden zwischengespeichert."}`
        : sync || `${wartend} Änderung(en) warten auf Synchronisation…`}
    </div>
  );
}
