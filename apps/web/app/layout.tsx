import type { Metadata } from "next";

import { Suivi } from "@/components/suivi";
import { env } from "@/lib/env";

import "./globals.css";

// Réglages lus à chaque requête : la même image sert partout, seul
// l'environnement du conteneur change.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Golfe de Saint-Tropez",
};

export default function Racine({ children }: { children: React.ReactNode }) {
  const e = env();
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <Suivi dsn={e.SENTRY_DSN} version={e.GIT_SHA} environnement={e.ENVIRONNEMENT} />
        {children}
      </body>
    </html>
  );
}
