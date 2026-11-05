import { type AlerteListe, estDepassee } from "./alertes";
import type { Famille } from "./echeances";

export type GroupeMois = {
  mois: string;
  libelle: string;
  alertes: AlerteListe[];
  contientDepassee: boolean;
};

export type SyntheseEcheancier = {
  depassees: number;
  sousTrenteJours: number;
};

export const FAMILLE_TOUTES = "";

export type CriteresEcheancier = { famille: Famille | typeof FAMILLE_TOUTES };

export function filtrerParFamille(
  alertes: AlerteListe[],
  criteres: CriteresEcheancier,
): AlerteListe[] {
  return criteres.famille === FAMILLE_TOUTES
    ? alertes
    : alertes.filter((a) => a.famille === criteres.famille);
}

export function syntheseEcheancier(alertes: AlerteListe[]): SyntheseEcheancier {
  return {
    depassees: alertes.filter(estDepassee).length,
    sousTrenteJours: alertes.filter((a) => a.joursRestants >= 0 && a.joursRestants <= 30).length,
  };
}

function libelleMois(mois: string): string {
  const instant = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)) - 1, 1));
  const texte = instant.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function grouperParMois(alertes: AlerteListe[]): GroupeMois[] {
  const groupes = new Map<string, AlerteListe[]>();
  for (const alerte of [...alertes].sort((a, b) => a.echeanceLe.localeCompare(b.echeanceLe))) {
    const mois = alerte.echeanceLe.slice(0, 7);
    groupes.set(mois, [...(groupes.get(mois) ?? []), alerte]);
  }
  return [...groupes].map(([mois, liste]) => ({
    mois,
    libelle: libelleMois(mois),
    alertes: liste,
    contientDepassee: liste.some(estDepassee),
  }));
}

export function jourDuMois(alerte: AlerteListe): string {
  return alerte.echeanceLe.slice(8, 10);
}
