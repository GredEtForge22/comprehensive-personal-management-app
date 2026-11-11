import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ma Vie – EDT, sport, sax, nutrition",
  description: "Emploi du temps, sport, saxophone, partitions, nutrition, habitudes et lycée.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:ml-56 md:max-w-none md:px-8 md:pb-10 lg:pr-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
