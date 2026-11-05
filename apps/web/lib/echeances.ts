/**
 * Règles d'échéance des marchés : calcul entièrement déterministe, sans appel
 * réseau et sans LLM. Les dates sont des jours au format AAAA-MM-JJ, la date
 * du jour est toujours passée en argument : une règle se teste par table, et
 * deux exécutions sur les mêmes données donnent le même résultat.
 *
 * L'agent signale, il ne décide pas : chaque alerte porte la raison qui l'a
 * déclenchée, en français, pour que l'agent instructeur puisse la vérifier.
 */

export const FAMILLES = [
  "reconduction",
  "garantie",
  "reception",
  "point_six_mois",
  "sans_bon_de_commande",
] as const;

export type Famille = (typeof FAMILLES)[number];

/** Nombre de jours d'anticipation par famille, à faire valider par les utilisateurs. */
export type Fenetres = Record<Famille, number>;

export const FENETRES: Fenetres = {
  reconduction: 120,
  garantie: 60,
  reception: 30,
  point_six_mois: 15,
  sans_bon_de_commande: 90,
};

/** Ce qu'une règle a besoin de savoir d'un marché, extrait du référentiel. */
export type MarcheSuivi = {
  reference: string;
  actif: boolean;
  solde: boolean;
  aBonsDeCommande: boolean;
  reconductionTacite: boolean | null;
  debuteLe: string | null;
  finitLe: string | null;
  garantieFinitLe: string | null;
  receptionneLe: string | null;
  dernierEngagementLe: string | null;
};

export type Alerte = {
  famille: Famille;
  reference: string;
  /** Jour où l'action devient impérative. */
  echeanceLe: string;
  /** Jours restants à la date d'évaluation, négatif si l'échéance est passée. */
  joursRestants: number;
  /** Phrase lisible par un agent instructeur, sans vocabulaire technique. */
  explication: string;
};

const JOUR_MS = 86_400_000;

function enJour(iso: string): number {
  const annee = Number(iso.slice(0, 4));
  const mois = Number(iso.slice(5, 7));
  const jour = Number(iso.slice(8, 10));
  return Date.UTC(annee, mois - 1, jour) / JOUR_MS;
}

function ajouter(iso: string, jours: number): string {
  return new Date((enJour(iso) + jours) * JOUR_MS).toISOString().slice(0, 10);
}

function ecart(de: string, a: string): number {
  return enJour(a) - enJour(de);
}

/**
 * Déclenche une alerte quand l'échéance entre dans la fenêtre d'anticipation,
 * et la garde tant qu'elle n'est pas traitée, y compris une fois dépassée :
 * une échéance ratée doit rester visible.
 */
function dansLaFenetre(aujourdHui: string, echeance: string, fenetre: number): boolean {
  return ecart(aujourdHui, echeance) <= fenetre;
}

function alerte(
  famille: Famille,
  marche: MarcheSuivi,
  echeanceLe: string,
  aujourdHui: string,
  explication: string,
): Alerte {
  return {
    famille,
    reference: marche.reference,
    echeanceLe,
    joursRestants: ecart(aujourdHui, echeanceLe),
    explication,
  };
}

/**
 * Évalue les cinq familles pour un marché. Un marché soldé ou inactif ne
 * produit plus rien : la décision a été prise dans CIRIL, l'agent s'efface.
 */
export function evaluer(
  marche: MarcheSuivi,
  aujourdHui: string,
  fenetres: Fenetres = FENETRES,
): Alerte[] {
  if (!marche.actif || marche.solde) return [];

  const alertes: Alerte[] = [];

  if (marche.finitLe && marche.reconductionTacite !== null) {
    const limite = ajouter(marche.finitLe, -fenetres.reconduction);
    if (dansLaFenetre(aujourdHui, limite, 0)) {
      alertes.push(
        alerte(
          "reconduction",
          marche,
          limite,
          aujourdHui,
          marche.reconductionTacite
            ? `Reconduction tacite au ${marche.finitLe} : sans décision contraire, le marché repart.`
            : `Reconduction expresse à décider avant le ${marche.finitLe}.`,
        ),
      );
    }
  }

  if (
    marche.garantieFinitLe &&
    dansLaFenetre(aujourdHui, marche.garantieFinitLe, fenetres.garantie)
  ) {
    alertes.push(
      alerte(
        "garantie",
        marche,
        marche.garantieFinitLe,
        aujourdHui,
        `Fin de la garantie le ${marche.garantieFinitLe} : dernier moment pour signaler une réserve.`,
      ),
    );
  }

  if (
    marche.finitLe &&
    !marche.receptionneLe &&
    dansLaFenetre(aujourdHui, marche.finitLe, fenetres.reception)
  ) {
    alertes.push(
      alerte(
        "reception",
        marche,
        marche.finitLe,
        aujourdHui,
        `Le marché se termine le ${marche.finitLe} et aucune réception n'est enregistrée.`,
      ),
    );
  }

  if (marche.debuteLe) {
    const point = ajouter(marche.debuteLe, 182);
    if (dansLaFenetre(aujourdHui, point, fenetres.point_six_mois)) {
      alertes.push(
        alerte(
          "point_six_mois",
          marche,
          point,
          aujourdHui,
          `Six mois d'exécution au ${point} : point d'étape avec le titulaire.`,
        ),
      );
    }
  }

  if (marche.aBonsDeCommande && marche.debuteLe) {
    const depuis = marche.dernierEngagementLe ?? marche.debuteLe;
    const limite = ajouter(depuis, fenetres.sans_bon_de_commande);
    if (dansLaFenetre(aujourdHui, limite, 0)) {
      alertes.push(
        alerte(
          "sans_bon_de_commande",
          marche,
          limite,
          aujourdHui,
          marche.dernierEngagementLe
            ? `Aucun bon de commande depuis le ${marche.dernierEngagementLe}.`
            : `Aucun bon de commande depuis le début du marché, le ${marche.debuteLe}.`,
        ),
      );
    }
  }

  return alertes;
}

/** Évalue un portefeuille, de l'échéance la plus proche à la plus lointaine. */
export function evaluerPortefeuille(
  marches: MarcheSuivi[],
  aujourdHui: string,
  fenetres: Fenetres = FENETRES,
): Alerte[] {
  return marches
    .flatMap((m) => evaluer(m, aujourdHui, fenetres))
    .sort((a, b) => a.joursRestants - b.joursRestants);
}
