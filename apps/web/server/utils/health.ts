import { schema } from "@projet/db";
import { eq, sql } from "drizzle-orm";

import { getDb } from "./db";

export type Controle = () => Promise<void>;

export const SILENCE_PLANIFICATEUR_MS = 3 * 60_000;

export function requireRecentHeartbeat(vuLe: Date | undefined, now = new Date()): void {
  if (!vuLe) throw new Error("aucun battement du planificateur");
  if (now.getTime() - vuLe.getTime() > SILENCE_PLANIFICATEUR_MS) {
    throw new Error("planificateur silencieux");
  }
}

export const controles: Record<string, Controle> = {
  getDb: async () => {
    await getDb().execute(sql`select 1`);
  },
  planificateur: async () => {
    const row = await getDb().query.heartbeats.findFirst({
      where: eq(schema.heartbeats.service, "planificateur"),
    });
    requireRecentHeartbeat(row?.vuLe);
  },
};

export async function verifier(liste: Record<string, Controle> = controles) {
  const resultats: Record<string, string> = {};
  for (const [name, controle] of Object.entries(liste)) {
    try {
      await controle();
      resultats[name] = "ok";
    } catch (error) {
      resultats[name] = `erreur : ${error instanceof Error ? error.name : "inconnue"}`;
    }
  }
  const ok = Object.values(resultats).every((v) => v === "ok");
  return { ok, body: { statut: ok ? "ok" : "erreur", controles: resultats } };
}
