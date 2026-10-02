import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handwerk — Software für Haustechnik",
  description:
    "Serviceaufträge, Rapporte und QR-Rechnungen für Sanitär- und Heizungsbetriebe in der Schweiz.",
};

const nav = [
  { href: "/", label: "Übersicht" },
  { href: "/kunden", label: "Kunden" },
  { href: "/auftraege", label: "Aufträge" },
  { href: "/rechnungen", label: "Rechnungen" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              🔧 Handwerk
            </Link>
            <nav className="flex gap-4 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-2 py-1 hover:bg-slate-700">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
