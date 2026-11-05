import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests de contrat : appels RÉELS aux API tierces, lecture seule.
// Workflow `contrats` chaque nuit, jamais `make test`. Les secrets de la
// sandbox vivent dans apps/web/.env ; on les expose en process.env sans
// écraser l'environnement déjà posé (ex. GitHub Actions).
function chargerEnv(chemin: string): Record<string, string> {
  try {
    const texte = readFileSync(new URL(chemin, import.meta.url), "utf8");
    const env: Record<string, string> = {};
    for (const ligne of texte.split("\n")) {
      const paire = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!paire) continue;
      const cle = paire[1];
      const valeur = paire[2]?.replace(/^"(.*)"$/, "$1") ?? "";
      if (cle && !process.env[cle]) env[cle] = valeur;
    }
    return env;
  } catch {
    return {};
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["contrats/**/*.test.ts"],
    testTimeout: 60_000,
    env: chargerEnv("./.env"),
  },
});
