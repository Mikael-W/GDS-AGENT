import { describe, expect, test } from "vitest";

import {
  type AlertListItem,
  alertLink,
  deadlineLabel,
  departments,
  filter,
  isOverdue,
  listTitle,
  summarize,
  urgency,
} from "@/shared/domain/alerts";

function alert(fields: Partial<AlertListItem> = {}): AlertListItem {
  return {
    family: "reconduction",
    reference: "AO 25075",
    deadlineOn: "2026-11-09",
    daysRemaining: 4,
    explanation:
      "Le marché prend fin le 09/12/2026 et sera reconduit tacitement sans décision contraire.",
    subject: "Entretien des espaces verts et des abords",
    service: "Espaces verts",
    ...fields,
  };
}

const portfolio = [
  alert({ reference: "MA 24029", family: "reception", daysRemaining: -48, service: "Travaux" }),
  alert({
    reference: "AO 24034",
    family: "sans_bon_de_commande",
    daysRemaining: -16,
    service: "Pôle eau",
  }),
  alert({
    reference: "AO 25075",
    family: "reconduction",
    daysRemaining: 4,
    service: "Espaces verts",
  }),
  alert({ reference: "MA 24036", family: "garantie", daysRemaining: 21, service: "Travaux" }),
  alert({
    reference: "MA 26045",
    family: "point_six_mois",
    daysRemaining: 26,
    service: "Travaux",
  }),
  alert({
    reference: "AO 26028",
    family: "reconduction",
    daysRemaining: 61,
    service: "Espaces verts",
  }),
];

const allPeriods = { view: "a_traiter", service: "", family: "", period: "toutes" } as const;

describe("urgency of an alert", () => {
  describe("Given an alert whose deadline passed 16 days ago", () => {
    describe("When its urgency is evaluated", () => {
      test("Then it is late", () => {
        const a = alert({ daysRemaining: -16 });

        const level = urgency(a);

        expect(level).toBe("retard");
        expect(isOverdue(a)).toBe(true);
      });
    });
  });

  describe("Given an alert 30 days from the deadline", () => {
    describe("When its urgency is evaluated", () => {
      test("Then it requires attention", () => {
        const a = alert({ daysRemaining: 30 });

        const level = urgency(a);

        expect(level).toBe("attention");
      });
    });
  });

  describe("Given an alert 61 days from the deadline", () => {
    describe("When its urgency is evaluated", () => {
      test("Then it simply needs watching", () => {
        const a = alert({ daysRemaining: 61 });

        const level = urgency(a);

        expect(level).toBe("information");
      });
    });
  });

  describe("Given an alert whose deadline falls today", () => {
    describe("When its urgency is evaluated", () => {
      test("Then it is not overdue yet", () => {
        const a = alert({ daysRemaining: 0 });

        const overdue = isOverdue(a);

        expect(overdue).toBe(false);
      });
    });
  });
});

describe("alerts summary", () => {
  describe("Given six alerts, two of them overdue", () => {
    describe("When the alerts are counted", () => {
      test("Then six are to treat, two of them overdue", () => {
        const summary = summarize(portfolio);

        expect(summary).toEqual({ toTreat: 6, overdue: 2 });
      });
    });
  });
});

describe("alert list filters", () => {
  describe("Given six alerts to treat", () => {
    describe("When overdue alerts are kept", () => {
      test("Then only the two past deadlines remain", () => {
        const result = filter(portfolio, { ...allPeriods, view: "depassees" });

        expect(result.map((a) => a.reference)).toEqual(["MA 24029", "AO 24034"]);
      });
    });

    describe("When the Travaux department is chosen", () => {
      test("Then only its three alerts remain", () => {
        const result = filter(portfolio, { ...allPeriods, service: "Travaux" });

        expect(result.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });

    describe("When the reconduction family is chosen", () => {
      test("Then only the two reconductions remain", () => {
        const result = filter(portfolio, { ...allPeriods, family: "reconduction" });

        expect(result.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When looking at the next 30 days", () => {
      test("Then overdue alerts stay visible with those falling within a month", () => {
        const result = filter(portfolio, { ...allPeriods, period: "30" });

        expect(result.map((a) => a.reference)).toEqual([
          "MA 24029",
          "AO 24034",
          "AO 25075",
          "MA 24036",
          "MA 26045",
        ]);
      });
    });

    describe("When the Travaux department and the 30-day period are combined", () => {
      test("Then both criteria apply together", () => {
        const result = filter(portfolio, { ...allPeriods, service: "Travaux", period: "30" });

        expect(result.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });
  });
});

describe("departments offered in the filter", () => {
  describe("Given alerts from three departments, one of them without department", () => {
    describe("When departments are listed", () => {
      test("Then each department appears once, in alphabetical order", () => {
        const list = departments([...portfolio, alert({ service: null })]);

        expect(list).toEqual(["Espaces verts", "Pôle eau", "Travaux"]);
      });
    });
  });
});

describe("deadline label", () => {
  describe("Given a deadline overdue by 48 days", () => {
    describe("When it is worded", () => {
      test("Then it reads that it is overdue by 48 days", () => {
        const label = deadlineLabel(-48);

        expect(label).toBe("Dépassée de 48 jours");
      });
    });
  });

  describe("Given a deadline overdue by one day", () => {
    describe("When it is worded", () => {
      test("Then the word day stays singular", () => {
        const label = deadlineLabel(-1);

        expect(label).toBe("Dépassée de 1 jour");
      });
    });
  });

  describe("Given a deadline in 4 days", () => {
    describe("When it is worded", () => {
      test("Then it reads that it falls in 4 days", () => {
        const label = deadlineLabel(4);

        expect(label).toBe("Dans 4 jours");
      });
    });
  });

  describe("Given a deadline today", () => {
    describe("When it is worded", () => {
      test("Then it reads today", () => {
        const label = deadlineLabel(0);

        expect(label).toBe("Aujourd'hui");
      });
    });
  });
});

describe("list title", () => {
  describe("Given the To treat tab with six alerts", () => {
    describe("When the title is worded", () => {
      test("Then it reads six alerts to treat", () => {
        const title = listTitle("a_traiter", 6);

        expect(title).toBe("6 alertes à traiter");
      });
    });
  });

  describe("Given the Overdue tab with two alerts", () => {
    describe("When the title is worded", () => {
      test("Then it reads two overdue alerts, in the plural", () => {
        const title = listTitle("depassees", 2);

        expect(title).toBe("2 alertes dépassées");
      });
    });
  });

  describe("Given the Overdue tab with a single alert", () => {
    describe("When the title is worded", () => {
      test("Then it reads one overdue alert, in the singular", () => {
        const title = listTitle("depassees", 1);

        expect(title).toBe("1 alerte dépassée");
      });
    });
  });
});

describe("link to an alert detail", () => {
  describe("Given the reconduction alert of contract AO 25075", () => {
    describe("When its link is built", () => {
      test("Then the reference is escaped for the address and the family follows", () => {
        const a = alert({ reference: "AO 25075", family: "reconduction" });

        const link = alertLink(a);

        expect(link).toBe("/alertes/AO%2025075/reconduction");
      });
    });
  });
});
