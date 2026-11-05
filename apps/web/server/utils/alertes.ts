import { engagements, marches, traitementsAlertes } from "@projet/db/schema";
import { and, eq, max } from "drizzle-orm";

import type { AlerteListe, DetailAlerte } from "#shared/domaine/alertes";
import {
  type Alerte,
  evaluer,
  evaluerEcheancier,
  evaluerPortefeuille,
  type Famille,
  type MarcheSuivi,
} from "#shared/domaine/echeances";
import { base } from "./base";

type Base = ReturnType<typeof base>;

function suivis(db: Base, reference?: string) {
  return db
    .select({
      id: marches.id,
      reference: marches.reference,
      objet: marches.objet,
      service: marches.service,
      titulaire: marches.titulaire,
      notifieLe: marches.notifieLe,
      montantInitial: marches.montantInitial,
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
    .where(reference ? eq(marches.reference, reference) : undefined)
    .groupBy(marches.id);
}

const cle = (marcheId: number, famille: string, echeanceLe: string) =>
  `${marcheId}|${famille}|${echeanceLe}`;

async function nonTraitees(
  db: Base,
  calculer: (portefeuille: MarcheSuivi[]) => Alerte[],
): Promise<AlerteListe[]> {
  const portefeuille = await suivis(db);
  const traitees = new Set(
    (await db.select().from(traitementsAlertes)).map((t) =>
      cle(t.marcheId, t.famille, t.echeanceLe),
    ),
  );

  const parReference = new Map(portefeuille.map((m) => [m.reference, m]));
  return calculer(portefeuille).flatMap((alerte) => {
    const marche = parReference.get(alerte.reference);
    if (!marche || traitees.has(cle(marche.id, alerte.famille, alerte.echeanceLe))) return [];
    return [{ ...alerte, objet: marche.objet, service: marche.service }];
  });
}

export function listerAlertes(aujourdhui: string, db = base()): Promise<AlerteListe[]> {
  return nonTraitees(db, (portefeuille) => evaluerPortefeuille(portefeuille, aujourdhui));
}

export function listerEcheances(aujourdhui: string, db = base()): Promise<AlerteListe[]> {
  return nonTraitees(db, (portefeuille) => evaluerEcheancier(portefeuille, aujourdhui));
}

async function chercher(reference: string, famille: Famille, aujourdhui: string, db: Base) {
  const [marche] = await suivis(db, reference);
  const alerte = marche && evaluer(marche, aujourdhui).find((a) => a.famille === famille);
  return marche && alerte ? { marche, alerte } : undefined;
}

export async function detailAlerte(
  reference: string,
  famille: Famille,
  aujourdhui: string,
  db = base(),
): Promise<DetailAlerte | undefined> {
  const trouvee = await chercher(reference, famille, aujourdhui, db);
  if (!trouvee) return undefined;
  const { marche, alerte } = trouvee;

  const [traitement] = await db
    .select()
    .from(traitementsAlertes)
    .where(
      and(
        eq(traitementsAlertes.marcheId, marche.id),
        eq(traitementsAlertes.famille, famille),
        eq(traitementsAlertes.echeanceLe, alerte.echeanceLe),
      ),
    );

  return {
    ...alerte,
    objet: marche.objet,
    service: marche.service,
    titulaire: marche.titulaire,
    notifieLe: marche.notifieLe,
    debuteLe: marche.debuteLe,
    finitLe: marche.finitLe,
    montantInitial: marche.montantInitial,
    solde: marche.solde,
    traitement: traitement
      ? { commentaire: traitement.commentaire, traiteLe: traitement.traiteLe.toISOString() }
      : null,
  };
}

export type SaisieTraitement = {
  reference: string;
  famille: Famille;
  commentaire: string;
  traitePar: string;
};

export async function traiterAlerte(
  saisie: SaisieTraitement,
  aujourdhui: string,
  db = base(),
): Promise<"traitee" | "deja_traitee" | "inconnue"> {
  const trouvee = await chercher(saisie.reference, saisie.famille, aujourdhui, db);
  if (!trouvee) return "inconnue";

  const inseres = await db
    .insert(traitementsAlertes)
    .values({
      marcheId: trouvee.marche.id,
      famille: saisie.famille,
      echeanceLe: trouvee.alerte.echeanceLe,
      commentaire: saisie.commentaire,
      traitePar: saisie.traitePar,
    })
    .onConflictDoNothing()
    .returning({ id: traitementsAlertes.id });
  return inseres.length > 0 ? "traitee" : "deja_traitee";
}
