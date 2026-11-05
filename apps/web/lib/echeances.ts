/**
 * Règles d'échéance des marchés : calcul entièrement déterministe, sans appel
 * réseau et sans LLM. Les dates sont des jours au format AAAA-MM-JJ, la date
 * du jour est toujours passée en argument : une règle se teste par table, et
 * deux exécutions sur les mêmes données donnent le même résultat.
 *
 * Les cinq familles et leurs déclencheurs viennent de l'atelier 1 et de la
 * restitution S1. Trois d'entre elles relancent tant que la donnée attendue
 * n'est pas saisie dans CIRIL : une échéance ratée ne disparaît pas.
 *
 * L'agent signale, il ne décide pas : chaque alerte porte la raison qui l'a
 * déclenchée, en français, pour que l'agent instructeur puisse la vérifier.
 */

export const FAMILLES = [
  "reconduction",
  "reception_manquante",
  "retenue_garantie",
  "sans_bon_de_commande",
  "point_six_mois",
] as const;

export type Famille = (typeof FAMILLES)[number];

export const LIBELLES: Record<Famille, string> = {
  reconduction: "Reconduction",
  reception_manquante: "Réception manquante",
  retenue_garantie: "Retenue de garantie",
  sans_bon_de_commande: "Sans bon de commande",
  point_six_mois: "Point à six mois",
};

/**
 * Paramètres des règles, à faire confirmer marché par marché quand le CCAP
 * dit autre chose : le préavis de non-reconduction, en particulier, est lu
 * dans le CCAP et vaut 1 mois sur certains marchés.
 */
export type Reglages = {
  /** Préavis de non-reconduction retenu par le service, à défaut de CCAP. */
  preavisReconductionMois: number;
  /** Première relance après la fin de marché sans réception saisie. */
  receptionPremiereRelanceMois: number;
  /** Intervalle des relances suivantes, tant que la réception manque. */
  receptionRelanceMois: number;
  /** Délai après réception au terme duquel la retenue peut être libérée. */
  retenueApresReceptionMois: number;
  /** Première relance après notification sans aucun bon de commande. */
  bonDeCommandePremiereRelanceJours: number;
  /** Intervalle des relances suivantes, tant qu'aucun bon de commande. */
  bonDeCommandeRelanceJours: number;
  /** Le point mensuel annonce les marchés atteignant six mois le mois suivant. */
  pointMoisAnnonce: number;
};

export const REGLAGES: Reglages = {
  preavisReconductionMois: 3,
  receptionPremiereRelanceMois: 3,
  receptionRelanceMois: 3,
  retenueApresReceptionMois: 12,
  bonDeCommandePremiereRelanceJours: 15,
  bonDeCommandeRelanceJours: 15,
  pointMoisAnnonce: 5,
};

/** Ce qu'une règle a besoin de savoir d'un marché, extrait du référentiel. */
export type MarcheSuivi = {
  reference: string;
  actif: boolean;
  solde: boolean;
  aBonsDeCommande: boolean;
  reconductible: boolean;
  /** Préavis lu dans le CCAP, en mois ; sinon celui des réglages s'applique. */
  preavisReconductionMois: number | null;
  notifieLe: string | null;
  /** Début de la période d'exécution en cours, reconduction comprise. */
  debuteLe: string | null;
  /** Fin de la période d'exécution en cours. */
  finitLe: string | null;
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
  /** Nombre de relances déjà passées, 0 pour une première alerte. */
  relances: number;
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

function versIso(jours: number): string {
  return new Date(jours * JOUR_MS).toISOString().slice(0, 10);
}

function ajouterJours(iso: string, jours: number): string {
  return versIso(enJour(iso) + jours);
}

/**
 * Ajoute des mois en gardant le quantième, ramené au dernier jour du mois
 * quand il n'existe pas : 31/01 plus 1 mois donne 28/02.
 */
function ajouterMois(iso: string, mois: number): string {
  const annee = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const jour = Number(iso.slice(8, 10));
  const total = (annee * 12 + (m - 1)) + mois;
  const nouvelleAnnee = Math.floor(total / 12);
  const nouveauMois = total % 12;
  const dernier = new Date(Date.UTC(nouvelleAnnee, nouveauMois + 1, 0)).getUTCDate();
  return versIso(Date.UTC(nouvelleAnnee, nouveauMois, Math.min(jour, dernier)) / JOUR_MS);
}

function ecart(de: string, a: string): number {
  return enJour(a) - enJour(de);
}

function alerte(
  famille: Famille,
  marche: MarcheSuivi,
  echeanceLe: string,
  aujourdHui: string,
  relances: number,
  explication: string,
): Alerte {
  return {
    famille,
    reference: marche.reference,
    echeanceLe,
    joursRestants: ecart(aujourdHui, echeanceLe),
    relances,
    explication,
  };
}

/**
 * Nombre de relances déjà passées pour une alerte qui revient à intervalle
 * fixe depuis une première échéance, et date de la relance courante.
 */
function relanceCourante(premiere: string, intervalleJours: number, aujourdHui: string) {
  const depuis = ecart(premiere, aujourdHui);
  if (depuis < 0) return { date: premiere, relances: 0 };
  const passees = Math.floor(depuis / intervalleJours);
  return { date: ajouterJours(premiere, passees * intervalleJours), relances: passees };
}

/**
 * Même chose pour une relance exprimée en mois : les mois n'ayant pas tous
 * la même longueur, on avance de mois en mois plutôt que de diviser des jours.
 */
function relanceCouranteMois(premiere: string, intervalleMois: number, aujourdHui: string) {
  if (ecart(premiere, aujourdHui) < 0) return { date: premiere, relances: 0 };
  let date = premiere;
  let relances = 0;
  for (let garde = 0; garde < 240; garde += 1) {
    const suivante = ajouterMois(date, intervalleMois);
    if (ecart(suivante, aujourdHui) < 0) break;
    date = suivante;
    relances += 1;
  }
  return { date, relances };
}

/**
 * Évalue les cinq familles pour un marché. Un marché soldé ou inactif ne
 * produit plus rien : la décision a été prise dans CIRIL, l'agent s'efface.
 */
export function evaluer(
  marche: MarcheSuivi,
  aujourdHui: string,
  reglages: Reglages = REGLAGES,
): Alerte[] {
  if (!marche.actif || marche.solde) return [];

  const alertes: Alerte[] = [];

  // Reconduction : alerte au préavis, maintenue visible jusqu'à la décision.
  if (marche.reconductible && marche.finitLe) {
    const preavis = marche.preavisReconductionMois ?? reglages.preavisReconductionMois;
    const limite = ajouterMois(marche.finitLe, -preavis);
    // L'alerte s'ouvre quand on entre dans la fenêtre de préavis, et reste
    // visible une fois la date limite passée, tant qu'aucune décision n'est
    // enregistrée.
    if (ecart(aujourdHui, limite) <= 0) {
      alertes.push(
        alerte(
          "reconduction",
          marche,
          limite,
          aujourdHui,
          0,
          `Décision de non-reconduction à notifier avant le ${limite}, soit ${preavis} mois avant la fin de la période en cours, le ${marche.finitLe}. Sans décision contraire, le marché repart.`,
        ),
      );
    }
  }

  // Réception manquante : fin de marché plus 3 mois, puis tous les 3 mois.
  if (marche.finitLe && !marche.receptionneLe) {
    const premiere = ajouterMois(marche.finitLe, reglages.receptionPremiereRelanceMois);
    if (ecart(aujourdHui, premiere) <= 0) {
      const { date, relances } = relanceCouranteMois(
        premiere,
        reglages.receptionRelanceMois,
        aujourdHui,
      );
      alertes.push(
        alerte(
          "reception_manquante",
          marche,
          date,
          aujourdHui,
          relances,
          `Le marché s'est terminé le ${marche.finitLe} et aucune date de réception n'est enregistrée dans CIRIL. Rappel tous les ${reglages.receptionRelanceMois} mois jusqu'à la saisie.`,
        ),
      );
    }
  }

  // Retenue de garantie : un an après la réception, libération possible.
  if (marche.receptionneLe) {
    const liberation = ajouterMois(marche.receptionneLe, reglages.retenueApresReceptionMois);
    alertes.push(
      alerte(
        "retenue_garantie",
        marche,
        liberation,
        aujourdHui,
        0,
        `Réception prononcée le ${marche.receptionneLe}. Au ${liberation}, la retenue de garantie peut être libérée, après contrôle humain.`,
      ),
    );
  }

  // Sans bon de commande : notification plus 15 jours, puis tous les 15 jours.
  if (marche.aBonsDeCommande && marche.notifieLe && !marche.dernierEngagementLe) {
    const premiere = ajouterJours(marche.notifieLe, reglages.bonDeCommandePremiereRelanceJours);
    if (ecart(aujourdHui, premiere) <= 0) {
      const { date, relances } = relanceCourante(
        premiere,
        reglages.bonDeCommandeRelanceJours,
        aujourdHui,
      );
      alertes.push(
        alerte(
          "sans_bon_de_commande",
          marche,
          date,
          aujourdHui,
          relances,
          `Notifié le ${marche.notifieLe}, aucun bon de commande dans CIRIL depuis. Rappel tous les ${reglages.bonDeCommandeRelanceJours} jours.`,
        ),
      );
    }
  }

  // Point à six mois : annoncé au point mensuel du mois précédent.
  if (marche.debuteLe) {
    const sixMois = ajouterMois(marche.debuteLe, 6);
    const annonce = ajouterMois(marche.debuteLe, reglages.pointMoisAnnonce);
    if (ecart(aujourdHui, annonce) <= 0 && ecart(aujourdHui, sixMois) >= 0) {
      alertes.push(
        alerte(
          "point_six_mois",
          marche,
          sixMois,
          aujourdHui,
          0,
          `Six mois d'exécution au ${sixMois}, à inscrire au point mensuel du 1er. La période en cours a démarré le ${marche.debuteLe}.`,
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
  reglages: Reglages = REGLAGES,
): Alerte[] {
  return marches
    .flatMap((m) => evaluer(m, aujourdHui, reglages))
    .sort((a, b) => a.joursRestants - b.joursRestants);
}

/**
 * Point mensuel du 1er : les marchés dont les six mois d'exécution tombent
 * dans le mois suivant. Envoyé en une fois, pas marché par marché.
 */
export function pointMensuel(
  marches: MarcheSuivi[],
  premierDuMois: string,
  reglages: Reglages = REGLAGES,
): Alerte[] {
  const debutMoisSuivant = ajouterMois(premierDuMois, 1);
  const debutMoisDApres = ajouterMois(premierDuMois, 2);
  return marches
    .filter((m) => m.actif && !m.solde && m.debuteLe)
    .flatMap((m) => {
      const sixMois = ajouterMois(m.debuteLe as string, 6);
      if (ecart(debutMoisSuivant, sixMois) < 0) return [];
      if (ecart(debutMoisDApres, sixMois) >= 0) return [];
      return [
        alerte(
          "point_six_mois",
          m,
          sixMois,
          premierDuMois,
          0,
          `Six mois d'exécution au ${sixMois}. Période en cours démarrée le ${m.debuteLe}.`,
        ),
      ];
    })
    .sort((a, b) => a.joursRestants - b.joursRestants);
}

export { ajouterMois };
