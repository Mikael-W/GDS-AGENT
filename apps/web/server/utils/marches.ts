import { lots, marches } from "@projet/db/schema";
import { asc, count, eq } from "drizzle-orm";

import type { MarcheListe } from "#shared/domaine/marches";
import { base } from "./base";

export async function listerMarches(db = base()): Promise<MarcheListe[]> {
  return db
    .select({
      reference: marches.reference,
      objet: marches.objet,
      titulaire: marches.titulaire,
      service: marches.service,
      debuteLe: marches.debuteLe,
      finitLe: marches.finitLe,
      montantInitial: marches.montantInitial,
      montantAvenants: marches.montantAvenants,
      actif: marches.actif,
      solde: marches.solde,
      lots: count(lots.id),
    })
    .from(marches)
    .leftJoin(lots, eq(lots.marcheId, marches.id))
    .groupBy(marches.id)
    .orderBy(asc(marches.reference));
}
