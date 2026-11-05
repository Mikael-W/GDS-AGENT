import { engagements, marches } from "@projet/db/schema";
import { eq, max } from "drizzle-orm";

import type { AlerteListe } from "#shared/domaine/alertes";
import { evaluerPortefeuille } from "#shared/domaine/echeances";
import { base } from "./base";

export async function listerAlertes(aujourdhui: string, db = base()): Promise<AlerteListe[]> {
  const suivis = await db
    .select({
      reference: marches.reference,
      objet: marches.objet,
      service: marches.service,
      actif: marches.actif,
      solde: marches.solde,
      aBonsDeCommande: marches.aBonsDeCommande,
      reconductionTacite: marches.reconductionTacite,
      debuteLe: marches.debuteLe,
      finitLe: marches.finitLe,
      garantieFinitLe: marches.garantieFinitLe,
      receptionneLe: marches.receptionneLe,
      dernierEngagementLe: max(engagements.emisLe),
    })
    .from(marches)
    .leftJoin(engagements, eq(engagements.marcheId, marches.id))
    .groupBy(marches.id);

  const parReference = new Map(suivis.map((m) => [m.reference, m]));
  return evaluerPortefeuille(suivis, aujourdhui).map((alerte) => ({
    ...alerte,
    objet: parReference.get(alerte.reference)?.objet ?? null,
    service: parReference.get(alerte.reference)?.service ?? null,
  }));
}
