import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests de contrat : appels RÉELS aux API tierces, lecture seule.
// Workflow `contrats` chaque nuit, jamais `make test`. Les secrets de la
// sandbox vivent dans apps/web/.env ; on les expose en process.env sans
// écraser l'environnement déjà posé (ex. GitHub Actions).
function chargerEnv(chemin: string): Record<string, string> {
  try {
    const text = readFileSync(new URL(chemin, import.meta.url), "utf8");
    const env: Record<string, string> = {};
    for (const row of text.split("\n")) {
      const paire = row.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!paire) continue;
      const key = paire[1];
      const value = paire[2]?.replace(/^"(.*)"$/, "$1") ?? "";
      if (key && !process.env[key]) env[key] = value;
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
