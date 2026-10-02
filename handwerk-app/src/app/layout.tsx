import type { Metadata } from "next";
import Link from "next/link";
import { leseSitzung } from "@/lib/auth";
import { logout } from "@/lib/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handwerk — Software für Haustechnik",
  description:
    "Serviceaufträge, Rapporte und QR-Rechnungen für Sanitär- und Heizungsbetriebe in der Schweiz.",
};

const nav = [
  { href: "/", label: "Übersicht" },
  { href: "/kunden", label: "Kunden" },
  { href: "/offerten", label: "Offerten" },
  { href: "/auftraege", label: "Aufträge" },
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/artikel", label: "Artikel" },
  { href: "/einstellungen", label: "Einstellungen" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sitzung = await leseSitzung();

  return (
    <html lang="de">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <header className="bg-forest text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tiff-logo.svg" alt="Tiff" className="h-7 w-7 rounded" />
              Handwerk
              <span className="hidden text-[10px] font-normal uppercase tracking-widest text-gold sm:inline">
                by Tiff
              </span>
            </Link>
            {sitzung && (
              <>
                <nav className="flex gap-4 text-sm">
                  {nav.map((n) => (
                    <Link key={n.href} href={n.href} className="rounded px-2 py-1 hover:bg-forest-lift">
                      {n.label}
                    </Link>
                  ))}
                </nav>
                <div className="ml-auto flex items-center gap-3 text-sm">
                  <span className="text-white/70">
                    {sitzung.mitarbeiter.name} · {sitzung.mitarbeiter.betrieb.name}
                  </span>
                  <form action={logout}>
                    <button className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-forest-lift">
                      Abmelden
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
