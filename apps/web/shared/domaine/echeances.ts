export const FAMILLES = [
  "reconduction",
  "garantie",
  "reception",
  "point_six_mois",
  "sans_bon_de_commande",
] as const;

export type Famille = (typeof FAMILLES)[number];

export type Fenetres = Record<Famille, number>;

export const FENETRES: Fenetres = {
  reconduction: 120,
  garantie: 60,
  reception: 30,
  point_six_mois: 15,
  sans_bon_de_commande: 90,
};

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
  echeanceLe: string;
  joursRestants: number;
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

export function evaluerPortefeuille(
  marches: MarcheSuivi[],
  aujourdHui: string,
  fenetres: Fenetres = FENETRES,
): Alerte[] {
  return marches
    .flatMap((m) => evaluer(m, aujourdHui, fenetres))
    .sort((a, b) => a.joursRestants - b.joursRestants);
}

export const HORIZON_ECHEANCIER = 183;

export function evaluerEcheancier(
  marches: MarcheSuivi[],
  aujourdHui: string,
  horizonJours: number = HORIZON_ECHEANCIER,
  fenetres: Fenetres = FENETRES,
): Alerte[] {
  const horizon = ajouter(aujourdHui, horizonJours);
  return evaluerPortefeuille(marches, horizon, fenetres)
    .filter((a) => a.echeanceLe <= horizon)
    .map((a) => ({ ...a, joursRestants: ecart(aujourdHui, a.echeanceLe) }));
}
