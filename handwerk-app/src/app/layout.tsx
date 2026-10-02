import type { Metadata } from "next";
import Link from "next/link";
import { leseSitzung } from "@/lib/auth";
import { logout, wechselBetrieb } from "@/lib/actions";
import Sidebar, { MobileNav } from "@/components/Sidebar";
import { TIFF } from "@/lib/tiff";
import { wirksameRechte } from "@/lib/rechte";
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

  return (
    <html lang="de">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {/* Topbar në strukturën e njohur bexio: logo majtas, kërkimi në qendër, përdoruesi djathtas */}
        <header className="sticky top-0 z-10 border-b border-line bg-white">
          <div className="flex h-14 items-center gap-4 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tiff-logo.svg" alt="Tiff" className="h-8 w-8 rounded" />
              <span className="hidden sm:inline">Handwerk</span>
              <span className="hidden text-[9px] font-normal uppercase tracking-widest text-gold lg:inline">
                by Tiff
              </span>
            </Link>
            {sitzung && (
              <>
                <form action="/suche" className="mx-auto w-full max-w-md">
                  <input
                    name="q"
                    placeholder="Suche (Kunden, Offerten, Aufträge, Rechnungen, Artikel…)"
                    className="w-full rounded-full border border-line bg-paper px-4 py-1.5 text-sm outline-none focus:border-forest"
                  />
                </form>
                <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
                  <span className="hidden text-muted md:inline">
                    {sitzung.mitarbeiter.name} · {sitzung.aktiverBetrieb.name}
                  </span>
                  <form action={logout}>
                    <button className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                      Abmelden
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
          {sitzung && <MobileNav erlaubt={wirksameRechte(sitzung.mitarbeiter)} />}
        </header>

        {sitzung ? (
          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <Sidebar
              betriebe={sitzung.betriebe.map((b) => ({ id: b.id, name: b.name }))}
              aktivId={sitzung.aktiverBetrieb.id}
              wechseln={wechselBetrieb}
              erlaubt={wirksameRechte(sitzung.mitarbeiter)}
              support={{ email: TIFF.supportEmail, telefon: TIFF.supportTelefon }}
            />
            <main className="w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>
          </div>
        ) : (
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        )}
        <PwaSetup />
      </body>
    </html>
  );
}
