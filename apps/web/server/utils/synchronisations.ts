import { synchronisations } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";

import { base } from "./base";
import { ErreurCiril } from "./ciril";

export type BilanSynchro = {
  recus: number;
  inseres: number;
  misAJour: number;
};

const LONGUEUR_MOTIF = 300;

function motifDeLEchec(erreur: unknown): string {
  if (erreur instanceof ErreurCiril) {
    return erreur.message.split(" : ")[0] ?? "CIRIL a refusé la requête";
  }
  const texte = erreur instanceof Error ? erreur.message : String(erreur);
  return texte.slice(0, LONGUEUR_MOTIF);
}

export async function journaliser<T extends BilanSynchro>(
  travail: () => Promise<T>,
  db = base(),
): Promise<T> {
  const [ligne] = await db
    .insert(synchronisations)
    .values({})
    .returning({ id: synchronisations.id });
  if (!ligne) throw new Error("Le journal des synchronisations n'a pas pu être écrit");
  const aLaLigne = eq(synchronisations.id, ligne.id);

  let bilan: T;
  try {
    bilan = await travail();
  } catch (erreur) {
    await db
      .update(synchronisations)
      .set({ resultat: "echec", termineeLe: sql`now()`, erreur: motifDeLEchec(erreur) })
      .where(aLaLigne)
      .catch(() => undefined);
    throw erreur;
  }

  await db
    .update(synchronisations)
    .set({
      resultat: "succes",
      termineeLe: sql`now()`,
      marchesLus: bilan.recus,
      marchesModifies: bilan.inseres + bilan.misAJour,
    })
    .where(aLaLigne);
  return bilan;
}
