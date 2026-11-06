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
    explanation:
      "Le marché prend fin le 04/03/2027 et sera reconduit tacitement sans décision contraire.",
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

describe("deadlines grouped by month", () => {
  describe("Given five deadlines spread over three months", () => {
    describe("When they are grouped", () => {
      test("Then each month carries its French label, in calendar order", () => {
        const groups = groupByMonth(deadlines);

        expect(groups.map((g) => g.label)).toEqual([
          "Novembre 2026",
          "Décembre 2026",
          "Janvier 2027",
        ]);
      });

      test("Then November gathers its three deadlines, from the nearest to the farthest", () => {
        const [november] = groupByMonth(deadlines);

        expect(november?.alerts.map((a) => a.reference)).toEqual([
          "AO 24034",
          "AO 25075",
          "MA 24036",
        ]);
      });

      test("Then only the month containing an overdue deadline is flagged late", () => {
        const groups = groupByMonth(deadlines);

        expect(groups.map((g) => g.containsOverdue)).toEqual([true, false, false]);
      });
    });
  });

  describe("Given deadlines given in disorder", () => {
    describe("When they are grouped", () => {
      test("Then the month order follows the calendar", () => {
        const january = alert({
          reference: "AO 26028",
          deadlineOn: "2027-01-05",
          daysRemaining: 61,
        });
        const november = alert({
          reference: "AO 24034",
          deadlineOn: "2026-11-04",
          daysRemaining: -1,
        });

        const groups = groupByMonth([january, november]);

        expect(groups.map((g) => g.month)).toEqual(["2026-11", "2027-01"]);
      });
    });
  });

  describe("Given no deadline", () => {
    describe("When they are grouped", () => {
      test("Then there is no month to display", () => {
        const groups = groupByMonth([]);

        expect(groups).toEqual([]);
      });
    });
  });
});

describe("schedule summary", () => {
  describe("Given one overdue deadline, two within the month and two later", () => {
    describe("When counting", () => {
      test("Then one is overdue and two fall within 30 days", () => {
        const summary = scheduleSummary(deadlines);

        expect(summary).toEqual({ overdue: 1, withinThirtyDays: 2 });
      });
    });
  });

  describe("Given a deadline falling today and one exactly 30 days away", () => {
    describe("When counting", () => {
      test("Then both count as within 30 days", () => {
        const summary = scheduleSummary([
          alert({ daysRemaining: 0 }),
          alert({ daysRemaining: 30 }),
        ]);

        expect(summary).toEqual({ overdue: 0, withinThirtyDays: 2 });
      });
    });
  });
});

describe("alert family filter", () => {
  describe("Given five deadlines, two of them reconductions", () => {
    describe("When the reconduction family is chosen", () => {
      test("Then only the two reconductions remain", () => {
        const result = filterByFamily(deadlines, { family: "reconduction" });

        expect(result.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When all families are kept", () => {
      test("Then all deadlines remain", () => {
        const result = filterByFamily(deadlines, { family: "" });

        expect(result).toHaveLength(5);
      });
    });
  });
});

describe("deadline day", () => {
  describe("Given a deadline on 9 November 2026", () => {
    describe("When its day is read", () => {
      test("Then it reads 09", () => {
        const day = dayOfMonth(alert({ deadlineOn: "2026-11-09" }));

        expect(day).toBe("09");
      });
    });
  });
});
