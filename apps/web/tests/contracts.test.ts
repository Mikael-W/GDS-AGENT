import { describe, expect, test } from "vitest";
import {
  type ContractListItem,
  departments,
  filter,
  formatAmount,
  formatCompactAmount,
  formatEuros,
  formatPeriod,
  isOngoing,
  notifiedAmount,
  summarize,
} from "@/shared/domain/contracts";

const today = "2026-11-05";

function contract(fields: Partial<ContractListItem> = {}): ContractListItem {
  return {
    reference: "AO 25075",
    subject: "Entretien des espaces verts et des abords",
    holder: "Titulaire C",
    service: "Espaces verts",
    startsOn: "2024-12-01",
    endsOn: "2027-12-01",
    initialAmount: "559200.00",
    amendmentsAmount: null,
    active: true,
    settled: false,
    lots: 1,
    ...fields,
  };
}

describe("notified amount of a contract", () => {
  describe("Given a 2,287,900 euro contract amended by a 12,500.50 euro amendment", () => {
    describe("When its notified amount is computed", () => {
      test("Then the amendment is added to the initial amount, to the cent", () => {
        const m = contract({ initialAmount: "2287900.00", amendmentsAmount: "12500.50" });

        const cents = notifiedAmount(m);

        expect(cents).toBe(230_040_050);
      });
    });
  });

  describe("Given a contract without amount filled in CIRIL", () => {
    describe("When its notified amount is computed", () => {
      test("Then the amount is zero rather than unknown", () => {
        const m = contract({ initialAmount: null, amendmentsAmount: null });

        const cents = notifiedAmount(m);

        expect(cents).toBe(0);
      });
    });
  });
});

describe("ongoing contract", () => {
  describe("Given a contract that ends today", () => {
    describe("When checking whether it is ongoing", () => {
      test("Then it still is on its end day", () => {
        const m = contract({ endsOn: today });

        const busy = isOngoing(m, today);

        expect(busy).toBe(true);
      });
    });
  });

  describe("Given a contract that ended yesterday", () => {
    describe("When checking whether it is ongoing", () => {
      test("Then it no longer is", () => {
        const m = contract({ endsOn: "2026-11-04" });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });

  describe("Given a contract without end date", () => {
    describe("When checking whether it is ongoing", () => {
      test("Then it is deemed ongoing, for lack of a known end", () => {
        const m = contract({ endsOn: null });

        const busy = isOngoing(m, today);

        expect(busy).toBe(true);
      });
    });
  });

  describe("Given a contract deactivated in CIRIL, whose end date is not reached", () => {
    describe("When checking whether it is ongoing", () => {
      test("Then it is not ongoing", () => {
        const m = contract({ active: false });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });

  describe("Given a settled contract, whose end date is not reached", () => {
    describe("When checking whether it is ongoing", () => {
      test("Then it is not ongoing", () => {
        const m = contract({ settled: true });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });
});

describe("portfolio summary", () => {
  describe("Given two ongoing contracts and one ended contract", () => {
    const portfolio = [
      contract({ reference: "AO 25075", lots: 2, initialAmount: "559200.00" }),
      contract({ reference: "AO 24034", lots: 1, initialAmount: "2287900.00" }),
      contract({
        reference: "MA 24036",
        lots: 4,
        initialAmount: "636900.00",
        endsOn: "2026-06-30",
      }),
    ];

    describe("When the summary is computed", () => {
      test("Then only ongoing contracts are counted as active", () => {
        const result = summarize(portfolio, today);

        expect(result.active).toBe(2);
      });

      test("Then the tracked lots are those of ongoing contracts", () => {
        const result = summarize(portfolio, today);

        expect(result.lots).toBe(3);
      });

      test("Then the notified amount is that of ongoing contracts", () => {
        const result = summarize(portfolio, today);

        expect(result.notifiedAmount).toBe(284_710_000);
      });
    });
  });

  describe("Given an empty portfolio", () => {
    describe("When the summary is computed", () => {
      test("Then all counters are zero", () => {
        const result = summarize([], today);

        expect(result).toEqual({ active: 0, lots: 0, notifiedAmount: 0 });
      });
    });
  });
});

describe("contract list filters", () => {
  const portfolio = [
    contract({
      reference: "AO 25075",
      subject: "Entretien des espaces verts",
      service: "Espaces verts",
    }),
    contract({
      reference: "AO 24034",
      subject: "Travaux sur le réseau d'eau potable",
      service: "Pôle eau",
      holder: "Titulaire B",
    }),
    contract({
      reference: "MA 24036",
      subject: "Travaux de génie civil, station de relevage",
      service: "Travaux",
      endsOn: "2026-06-30",
    }),
  ];
  const noCriteria = { search: "", service: "", state: "tous" } as const;

  describe("Given a search on a subject word written without accent", () => {
    describe("When filtering", () => {
      test("Then the contract whose subject carries that word with accent is found", () => {
        const criteria = { ...noCriteria, search: "reseau" };

        const result = filter(portfolio, criteria, today);

        expect(result.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given a search on a contract number", () => {
    describe("When filtering", () => {
      test("Then the contract with that number is found, regardless of case", () => {
        const criteria = { ...noCriteria, search: "ma 24036" };

        const result = filter(portfolio, criteria, today);

        expect(result.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });

  describe("Given the choice of a department", () => {
    describe("When filtering", () => {
      test("Then only the contracts of that department remain", () => {
        const criteria = { ...noCriteria, service: "Pôle eau" };

        const result = filter(portfolio, criteria, today);

        expect(result.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given the Ongoing status", () => {
    describe("When filtering", () => {
      test("Then the ended contract disappears from the list", () => {
        const criteria = { ...noCriteria, state: "en_cours" } as const;

        const result = filter(portfolio, criteria, today);

        expect(result.map((m) => m.reference)).toEqual(["AO 25075", "AO 24034"]);
      });
    });
  });

  describe("Given the Ended status", () => {
    describe("When filtering", () => {
      test("Then only the ended contract remains", () => {
        const criteria = { ...noCriteria, state: "termines" } as const;

        const result = filter(portfolio, criteria, today);

        expect(result.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });
});

describe("portfolio departments", () => {
  describe("Given contracts from several departments, one of them without department", () => {
    describe("When departments are listed", () => {
      test("Then each department appears once, sorted, without empty value", () => {
        const portfolio = [
          contract({ service: "Travaux" }),
          contract({ service: "Espaces verts" }),
          contract({ service: "Travaux" }),
          contract({ service: null }),
        ];

        const list = departments(portfolio);

        expect(list).toEqual(["Espaces verts", "Travaux"]);
      });
    });
  });
});

describe("presentation of amounts and periods", () => {
  describe("Given an amount of 559,200 euros", () => {
    describe("When it is formatted", () => {
      test("Then it carries the euro after a non-breaking space", () => {
        const text = formatAmount(55_920_000);

        expect(text).toBe("559 200,00 €");
      });
    });
  });

  describe("Given a portfolio of 38.4 million euros", () => {
    describe("When it is formatted in short form", () => {
      test("Then it is written in millions with one decimal", () => {
        const text = formatCompactAmount(3_840_000_000);

        expect(text).toBe("38,4 M€");
      });
    });
  });

  describe("Given an amount under one million", () => {
    describe("When it is formatted in short form", () => {
      test("Then it keeps its full notation", () => {
        const text = formatCompactAmount(31_845_000);

        expect(text).toBe("318 450,00 €");
      });
    });
  });

  describe("Given a contract from 1 December 2024 to 1 December 2027", () => {
    describe("When its period is formatted", () => {
      test("Then it is written in month and year", () => {
        const text = formatPeriod("2024-12-01", "2027-12-01");

        expect(text).toBe("12/2024 au 12/2027");
      });
    });
  });

  describe("Given a contract without any date", () => {
    describe("When its period is formatted", () => {
      test("Then it is reported as not filled in", () => {
        const text = formatPeriod(null, null);

        expect(text).toBe("Non renseignée");
      });
    });
  });
});

describe("initial contract amount in an alert detail", () => {
  describe("Given an initial amount of 186,400 euros", () => {
    describe("When it is displayed", () => {
      test("Then it is written in euros", () => {
        const text = formatEuros("186400.00");

        expect(text).toBe(formatAmount(18_640_000));
      });
    });
  });

  describe("Given a contract without initial amount in CIRIL", () => {
    describe("When it is displayed", () => {
      test("Then it reads that it is not filled in", () => {
        const text = formatEuros(null);

        expect(text).toBe("Non renseigné");
      });
    });
  });
});
