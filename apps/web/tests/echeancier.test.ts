import { describe, expect, test } from "vitest";

import type { AlerteListe } from "@/shared/domaine/alertes";
import {
  filtrerParFamille,
  grouperParMois,
  jourDuMois,
  syntheseEcheancier,
} from "@/shared/domaine/echeancier";

function alerte(champs: Partial<AlerteListe> = {}): AlerteListe {
  return {
    famille: "reconduction",
    reference: "AO 25075",
    echeanceLe: "2026-11-09",
    joursRestants: 4,
    explication: "Reconduction tacite au 04/03/2027 : sans décision contraire, le marché repart.",
    objet: "Entretien des espaces verts et des abords",
    service: "Espaces verts",
    ...champs,
  };
}

const echeances = [
  alerte({
    reference: "AO 24034",
    famille: "sans_bon_de_commande",
    echeanceLe: "2026-11-05",
    joursRestants: -1,
  }),
  alerte({
    reference: "AO 25075",
    famille: "reconduction",
    echeanceLe: "2026-11-09",
    joursRestants: 4,
  }),
  alerte({
    reference: "MA 24036",
    famille: "garantie",
    echeanceLe: "2026-11-26",
    joursRestants: 21,
  }),
  alerte({
    reference: "MA 26049",
    famille: "reception",
    echeanceLe: "2026-12-14",
    joursRestants: 39,
  }),
  alerte({
    reference: "AO 26028",
    famille: "reconduction",
    echeanceLe: "2027-01-05",
    joursRestants: 61,
  }),
];

describe("échéances regroupées par mois", () => {
  describe("Given cinq échéances réparties sur trois mois", () => {
    describe("When on les regroupe", () => {
      test("Then chaque mois porte son libellé en français, dans l'ordre du calendrier", () => {
        const groupes = grouperParMois(echeances);

        expect(groupes.map((g) => g.libelle)).toEqual([
          "Novembre 2026",
          "Décembre 2026",
          "Janvier 2027",
        ]);
      });

      test("Then novembre rassemble ses trois échéances, de la plus proche à la plus lointaine", () => {
        const [novembre] = grouperParMois(echeances);

        expect(novembre?.alertes.map((a) => a.reference)).toEqual([
          "AO 24034",
          "AO 25075",
          "MA 24036",
        ]);
      });

      test("Then seul le mois qui contient une échéance dépassée est signalé en retard", () => {
        const groupes = grouperParMois(echeances);

        expect(groupes.map((g) => g.contientDepassee)).toEqual([true, false, false]);
      });
    });
  });

  describe("Given des échéances données dans le désordre", () => {
    describe("When on les regroupe", () => {
      test("Then l'ordre des mois suit le calendrier", () => {
        const janvier = alerte({
          reference: "AO 26028",
          echeanceLe: "2027-01-05",
          joursRestants: 61,
        });
        const novembre = alerte({
          reference: "AO 24034",
          echeanceLe: "2026-11-04",
          joursRestants: -1,
        });

        const groupes = grouperParMois([janvier, novembre]);

        expect(groupes.map((g) => g.mois)).toEqual(["2026-11", "2027-01"]);
      });
    });
  });

  describe("Given aucune échéance", () => {
    describe("When on les regroupe", () => {
      test("Then il n'y a aucun mois à afficher", () => {
        const groupes = grouperParMois([]);

        expect(groupes).toEqual([]);
      });
    });
  });
});

describe("synthèse de l'échéancier", () => {
  describe("Given une échéance dépassée, deux dans le mois et deux plus tard", () => {
    describe("When on compte", () => {
      test("Then une est dépassée et deux tombent sous 30 jours", () => {
        const resume = syntheseEcheancier(echeances);

        expect(resume).toEqual({ depassees: 1, sousTrenteJours: 2 });
      });
    });
  });

  describe("Given une échéance qui tombe aujourd'hui et une à 30 jours exactement", () => {
    describe("When on compte", () => {
      test("Then les deux comptent comme sous 30 jours", () => {
        const resume = syntheseEcheancier([
          alerte({ joursRestants: 0 }),
          alerte({ joursRestants: 30 }),
        ]);

        expect(resume).toEqual({ depassees: 0, sousTrenteJours: 2 });
      });
    });
  });
});

describe("filtre par famille d'alerte", () => {
  describe("Given cinq échéances dont deux reconductions", () => {
    describe("When on choisit la famille reconduction", () => {
      test("Then seules les deux reconductions restent", () => {
        const resultat = filtrerParFamille(echeances, { famille: "reconduction" });

        expect(resultat.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When on garde toutes les familles", () => {
      test("Then toutes les échéances restent", () => {
        const resultat = filtrerParFamille(echeances, { famille: "" });

        expect(resultat).toHaveLength(5);
      });
    });
  });
});

describe("jour de l'échéance", () => {
  describe("Given une échéance au 9 novembre 2026", () => {
    describe("When on lit son jour", () => {
      test("Then on lit 09", () => {
        const jour = jourDuMois(alerte({ echeanceLe: "2026-11-09" }));

        expect(jour).toBe("09");
      });
    });
  });
});
