import type { Urgence } from "#shared/domaine/alertes";
import type { Famille } from "#shared/domaine/echeances";

export type PropsEtiquetteFamille = {
  famille: Famille;
  urgence: Urgence;
};
