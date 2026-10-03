import type { Metadata } from "next";
import { leseSitzung } from "@/lib/auth";
import { logout, wechselBetrieb } from "@/lib/actions";
import Sidebar, { MobileNav } from "@/components/Sidebar";
import Topbar, { type TopBetrieb } from "@/components/Topbar";
import { TIFF } from "@/lib/tiff";
import { db } from "@/lib/db";
import { wirksameRechte } from "@/lib/rechte";
import { istTiffAdmin } from "@/lib/registrierung";
import PwaSetup from "@/components/PwaSetup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handwerk — Software für Haustechnik",
  description:
    "Serviceaufträge, Rapporte und QR-Rechnungen für Sanitär- und Heizungsbetriebe in der Schweiz.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Handwerk", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#16653C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sitzung = await leseSitzung();
  const rechte = sitzung ? wirksameRechte(sitzung.mitarbeiter) : [];
  const tiffAdmin = sitzung ? istTiffAdmin(sitzung.mitarbeiter.email) : false;
  const support = { name: "TIFF", email: TIFF.supportEmail, telefon: TIFF.supportTelefon };
  // Logo-Version = Länge des gespeicherten Logos (ändert sich beim Austausch → Browser lädt neu)
  const topBetriebe: TopBetrieb[] = sitzung
    ? (
        await db.$queryRaw<{ id: string; name: string; len: number }[]>`
          SELECT id, name, LENGTH(logo) AS len FROM "Betrieb" WHERE id = ANY(${sitzung.betriebe.map((b) => b.id)})`
      )
        .map((b) => ({ id: b.id, name: b.name, logoV: Number(b.len) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <html lang="de">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {/* Kopfzeile wie bei bexio: Marke · Betrieb mit Logo · Suche · Hilfe · Einstellungen · Benutzermenü */}
        <header className="sticky top-0 z-20 border-b border-line bg-white print:hidden">
          {sitzung ? (
            <>
              <Topbar
                betriebe={topBetriebe}
                aktivId={sitzung.aktiverBetrieb.id}
                wechseln={wechselBetrieb}
                abmelden={logout}
                benutzer={{
                  id: sitzung.mitarbeiter.id,
                  name: sitzung.mitarbeiter.name,
                  email: sitzung.mitarbeiter.email ?? "",
                  fotoV: sitzung.mitarbeiter.foto.length,
                }}
                darfEinstellungen={rechte.includes("EINSTELLUNGEN")}
                tiffAdmin={tiffAdmin}
              />
              <MobileNav
                erlaubt={rechte}
                betriebe={topBetriebe.map((b) => ({ id: b.id, name: b.name }))}
                aktivId={sitzung.aktiverBetrieb.id}
                wechseln={wechselBetrieb}
                tiffAdmin={tiffAdmin}
                support={support}
              />
            </>
          ) : (
            <div className="flex h-14 items-center gap-2 px-4 font-bold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tiff-logo.svg" alt="" className="h-8 w-8 rounded" />
              Handwerk
              <span className="text-[9px] font-normal uppercase tracking-widest text-gold">by Tiff</span>
            </div>
          )}
        </header>

        {sitzung ? (
          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <Sidebar erlaubt={rechte} support={support} />
            <main className="mx-auto w-full min-w-0 max-w-[1800px] px-4 py-6 md:px-8">{children}</main>
          </div>
        ) : (
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        )}
        <PwaSetup />
      </body>
    </html>
  );
}
