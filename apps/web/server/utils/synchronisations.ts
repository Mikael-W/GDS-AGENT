import { synchronisations } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";

import { base } from "./base";

export type BilanSynchro = {
  recus: number;
  inseres: number;
  misAJour: number;
};

export async function journaliser<T extends BilanSynchro>(
  travail: () => Promise<T>,
  db = base(),
): Promise<T> {
  const [ligne] = await db
    .insert(synchronisations)
    .values({})
    .returning({ id: synchronisations.id });
  const id = ligne?.id ?? 0;
  try {
    const bilan = await travail();
    await db
      .update(synchronisations)
      .set({
        resultat: "succes",
        termineeLe: sql`now()`,
        marchesLus: bilan.recus,
        marchesModifies: bilan.inseres + bilan.misAJour,
      })
      .where(eq(synchronisations.id, id));
    return bilan;
  } catch (erreur) {
    await db
      .update(synchronisations)
      .set({
        resultat: "echec",
        termineeLe: sql`now()`,
        erreur: erreur instanceof Error ? erreur.message : String(erreur),
      })
      .where(eq(synchronisations.id, id));
    throw erreur;
  }
}
