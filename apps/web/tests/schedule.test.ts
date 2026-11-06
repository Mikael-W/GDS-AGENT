import { describe, expect, test } from "vitest";

import type { AlertListItem } from "@/shared/domain/alerts";
import {
  dayOfMonth,
  filterByFamily,
  groupByMonth,
  scheduleSummary,
} from "@/shared/domain/schedule";

function alert(fields: Partial<AlertListItem> = {}): AlertListItem {
  return {
    family: "reconduction",
    reference: "AO 25075",
    deadlineOn: "2026-11-09",
    daysRemaining: 4,
    explanation: "Reconduction tacite au 04/03/2027 : sans décision contraire, le marché repart.",
    subject: "Entretien des espaces verts et des abords",
    service: "Espaces verts",
    ...fields,
  };
}

const deadlines = [
  alert({
    reference: "AO 24034",
    family: "sans_bon_de_commande",
    deadlineOn: "2026-11-05",
    daysRemaining: -1,
  }),
  alert({
    reference: "AO 25075",
    family: "reconduction",
    deadlineOn: "2026-11-09",
    daysRemaining: 4,
  }),
  alert({
    reference: "MA 24036",
    family: "garantie",
    deadlineOn: "2026-11-26",
    daysRemaining: 21,
  }),
  alert({
    reference: "MA 26049",
    family: "reception",
    deadlineOn: "2026-12-14",
    daysRemaining: 39,
  }),
  alert({
    reference: "AO 26028",
    family: "reconduction",
    deadlineOn: "2027-01-05",
    daysRemaining: 61,
  }),
];

describe("échéances regroupées par mois", () => {
  describe("Given cinq échéances réparties sur trois mois", () => {
    describe("When on les regroupe", () => {
      test("Then chaque mois porte son libellé en français, dans l'ordre du calendrier", () => {
        const groups = groupByMonth(deadlines);

        expect(groups.map((g) => g.label)).toEqual([
          "Novembre 2026",
          "Décembre 2026",
          "Janvier 2027",
        ]);
      });

      test("Then novembre rassemble ses trois échéances, de la plus proche à la plus lointaine", () => {
        const [novembre] = groupByMonth(deadlines);

        expect(novembre?.alerts.map((a) => a.reference)).toEqual([
          "AO 24034",
          "AO 25075",
          "MA 24036",
        ]);
      });

      test("Then seul le mois qui contient une échéance dépassée est signalé en retard", () => {
        const groups = groupByMonth(deadlines);

        expect(groups.map((g) => g.containsOverdue)).toEqual([true, false, false]);
      });
    });
  });

  describe("Given des échéances données dans le désordre", () => {
    describe("When on les regroupe", () => {
      test("Then l'ordre des mois suit le calendrier", () => {
        const janvier = alert({
          reference: "AO 26028",
          deadlineOn: "2027-01-05",
          daysRemaining: 61,
        });
        const novembre = alert({
          reference: "AO 24034",
          deadlineOn: "2026-11-04",
          daysRemaining: -1,
        });

        const groups = groupByMonth([janvier, novembre]);

        expect(groups.map((g) => g.month)).toEqual(["2026-11", "2027-01"]);
      });
    });
  });

  describe("Given aucune échéance", () => {
    describe("When on les regroupe", () => {
      test("Then il n'y a aucun mois à afficher", () => {
        const groups = groupByMonth([]);

        expect(groups).toEqual([]);
      });
    });
  });
});

describe("synthèse de l'échéancier", () => {
  describe("Given une échéance dépassée, deux dans le mois et deux plus tard", () => {
    describe("When on compte", () => {
      test("Then une est dépassée et deux tombent sous 30 jours", () => {
        const summary = scheduleSummary(deadlines);

        expect(summary).toEqual({ overdue: 1, withinThirtyDays: 2 });
      });
    });
  });

  describe("Given une échéance qui tombe aujourd'hui et une à 30 jours exactement", () => {
    describe("When on compte", () => {
      test("Then les deux comptent comme sous 30 jours", () => {
        const summary = scheduleSummary([
          alert({ daysRemaining: 0 }),
          alert({ daysRemaining: 30 }),
        ]);

        expect(summary).toEqual({ overdue: 0, withinThirtyDays: 2 });
      });
    });
  });
});

describe("filtre par famille d'alerte", () => {
  describe("Given cinq échéances dont deux reconductions", () => {
    describe("When on choisit la famille reconduction", () => {
      test("Then seules les deux reconductions restent", () => {
        const resultat = filterByFamily(deadlines, { family: "reconduction" });

        expect(resultat.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When on garde toutes les familles", () => {
      test("Then toutes les échéances restent", () => {
        const resultat = filterByFamily(deadlines, { family: "" });

        expect(resultat).toHaveLength(5);
      });
    });
  });
});

describe("jour de l'échéance", () => {
  describe("Given une échéance au 9 novembre 2026", () => {
    describe("When on lit son jour", () => {
      test("Then on lit 09", () => {
        const day = dayOfMonth(alert({ deadlineOn: "2026-11-09" }));

        expect(day).toBe("09");
      });
    });
  });
});
