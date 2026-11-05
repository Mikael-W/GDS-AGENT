import { schema } from "@projet/db";
import { eq, sql } from "drizzle-orm";

import { base } from "./base";

export type Controle = () => Promise<void>;

export const SILENCE_PLANIFICATEUR_MS = 3 * 60_000;

export function exigerBattementRecent(vuLe: Date | undefined, maintenant = new Date()): void {
  if (!vuLe) throw new Error("aucun battement du planificateur");
  if (maintenant.getTime() - vuLe.getTime() > SILENCE_PLANIFICATEUR_MS) {
    throw new Error("planificateur silencieux");
  }
}

export const controles: Record<string, Controle> = {
  base: async () => {
    await base().execute(sql`select 1`);
  },
  planificateur: async () => {
    const ligne = await base().query.battements.findFirst({
      where: eq(schema.battements.service, "planificateur"),
    });
    exigerBattementRecent(ligne?.vuLe);
  },
};

export async function verifier(liste: Record<string, Controle> = controles) {
  const resultats: Record<string, string> = {};
  for (const [nom, controle] of Object.entries(liste)) {
    try {
      await controle();
      resultats[nom] = "ok";
    } catch (erreur) {
      resultats[nom] = `erreur : ${erreur instanceof Error ? erreur.name : "inconnue"}`;
    }
  }
  const ok = Object.values(resultats).every((v) => v === "ok");
  return { ok, corps: { statut: ok ? "ok" : "erreur", controles: resultats } };
}
