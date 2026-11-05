export const SEUIL_FRAICHEUR_MS = 26 * 3_600_000;

export type EtatFraicheur = "conforme" | "attention" | "retard";

export type Fraicheur = {
  etat: EtatFraicheur;
  titre: string;
  detail: string;
};

const jour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });
const heure = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short", timeZone: "Europe/Paris" });

export function fraicheur(derniereLecture: Date | null, maintenant: Date): Fraicheur {
  if (!derniereLecture) {
    return {
      etat: "attention",
      titre: "Aucune lecture de CIRIL",
      detail: "Les données de CIRIL n'ont pas encore été lues.",
    };
  }

  const quand = `${jour.format(derniereLecture)} à ${heure.format(derniereLecture)}`;
  const age = maintenant.getTime() - derniereLecture.getTime();

  if (age > SEUIL_FRAICHEUR_MS) {
    return { etat: "retard", titre: "Données anciennes", detail: `Dernière lecture le ${quand}` };
  }
  return { etat: "conforme", titre: "Données à jour", detail: `Lues dans CIRIL le ${quand}` };
}
