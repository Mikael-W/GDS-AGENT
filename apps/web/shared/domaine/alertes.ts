import { pluriel } from "./affichage";
import type { Alerte, Famille } from "./echeances";

export type AlerteListe = Alerte & {
  objet: string | null;
  service: string | null;
};

export type VueAlertes = "a_traiter" | "depassees";

export type PeriodeAlertes = "toutes" | "30" | "90";

export type Urgence = "retard" | "attention" | "information";

export type CriteresAlertes = {
  vue: VueAlertes;
  service: string;
  famille: Famille | "";
  periode: PeriodeAlertes;
};

export type SyntheseAlertes = {
  aTraiter: number;
  depassees: number;
};

export const LIBELLES_FAMILLE: Record<Famille, string> = {
  reconduction: "Reconduction",
  garantie: "Retenue de garantie",
  reception: "Réception manquante",
  point_six_mois: "Point à six mois",
  sans_bon_de_commande: "Sans bon de commande",
};

const SEUIL_BIENTOT = 30;

export function estDepassee(alerte: AlerteListe): boolean {
  return alerte.joursRestants < 0;
}

export function urgence(alerte: AlerteListe): Urgence {
  if (estDepassee(alerte)) return "retard";
  return alerte.joursRestants <= SEUIL_BIENTOT ? "attention" : "information";
}

export function synthese(alertes: AlerteListe[]): SyntheseAlertes {
  return { aTraiter: alertes.length, depassees: alertes.filter(estDepassee).length };
}

export function services(alertes: AlerteListe[]): string[] {
  const noms = alertes.flatMap((a) => (a.service ? [a.service] : []));
  return [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function filtrer(alertes: AlerteListe[], criteres: CriteresAlertes): AlerteListe[] {
  return alertes.filter((a) => {
    if (criteres.vue === "depassees" && !estDepassee(a)) return false;
    if (criteres.service && a.service !== criteres.service) return false;
    if (criteres.famille && a.famille !== criteres.famille) return false;
    if (criteres.periode !== "toutes" && a.joursRestants > Number(criteres.periode)) return false;
    return true;
  });
}

export function titreListe(vue: VueAlertes, total: number): string {
  const complement = vue === "depassees" ? "dépassée" : "à traiter";
  return `${pluriel(total, "alerte")} ${complement}${vue === "depassees" && total > 1 ? "s" : ""}`;
}

export function libelleEcheance(joursRestants: number): string {
  if (joursRestants === 0) return "Aujourd'hui";
  const jours = Math.abs(joursRestants);
  const unite = jours > 1 ? "jours" : "jour";
  return joursRestants < 0 ? `Dépassée de ${jours} ${unite}` : `Dans ${jours} ${unite}`;
}

export function formaterDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
