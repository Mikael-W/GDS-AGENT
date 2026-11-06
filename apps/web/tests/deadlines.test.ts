import { describe, expect, it, test } from "vitest";

import {
  type Alert,
  evaluate,
  evaluatePortfolio,
  evaluateSchedule,
  type TrackedContract,
} from "@/shared/domain/deadlines";

const BASE_CONTRACT: TrackedContract = {
  reference: "M-2026-001",
  active: true,
  settled: false,
  hasPurchaseOrders: false,
  tacitRenewal: null,
  startsOn: null,
  endsOn: null,
  warrantyEndsOn: null,
  receivedOn: null,
  lastCommitmentOn: null,
};

function contract(fields: Partial<TrackedContract>): TrackedContract {
  return { ...BASE_CONTRACT, ...fields };
}

function families(alerts: Alert[]): string[] {
  return alerts.map((a) => a.family).sort();
}

function only(alerts: Alert[], family: string): Alert {
  const found = alerts.find((a) => a.family === family);
  if (!found) throw new Error(`Aucune alerte ${family} parmi ${families(alerts).join(", ")}`);
  return found;
}

describe("contracts out of tracking", () => {
  it("a settled contract produces nothing anymore", () => {
    const m = contract({ settled: true, endsOn: "2026-12-01", tacitRenewal: true });
    expect(evaluate(m, "2026-11-04")).toEqual([]);
  });

  it("an inactive contract produces nothing anymore", () => {
    const m = contract({ active: false, endsOn: "2026-12-01", tacitRenewal: true });
    expect(evaluate(m, "2026-11-04")).toEqual([]);
  });
});

describe("reconduction", () => {
  it("triggers on entering the 120-day window", () => {
    const m = contract({ endsOn: "2027-03-04", tacitRenewal: true });
    expect(families(evaluate(m, "2026-11-03"))).toEqual([]);
    expect(families(evaluate(m, "2026-11-04"))).toContain("reconduction");
  });

  it("stays visible once the deadline is passed", () => {
    const m = contract({ endsOn: "2027-03-04", tacitRenewal: true });
    const a = only(evaluate(m, "2026-12-04"), "reconduction");
    expect(a.daysRemaining).toBe(-30);
  });

  it("distinguishes tacit from express reconduction", () => {
    const tacit = evaluate(contract({ endsOn: "2027-01-01", tacitRenewal: true }), "2026-11-04");
    const express = evaluate(contract({ endsOn: "2027-01-01", tacitRenewal: false }), "2026-11-04");
    expect(only(tacit, "reconduction").explanation).toContain("tacite");
    expect(only(express, "reconduction").explanation).toContain("expresse");
  });

  it("says nothing when the reconduction mode is unknown", () => {
    const m = contract({ endsOn: "2027-01-01", tacitRenewal: null });
    expect(families(evaluate(m, "2026-11-04"))).not.toContain("reconduction");
  });
});

describe("reception", () => {
  it("triggers within 30 days of the end, with no reception recorded", () => {
    const m = contract({ endsOn: "2026-11-20" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual(["reception"]);
  });

  it("goes silent as soon as the reception is recorded", () => {
    const m = contract({ endsOn: "2026-11-20", receivedOn: "2026-11-02" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual([]);
  });
});

describe("explanation phrases", () => {
  describe("Given a tacit renewal ending on 4 March 2027", () => {
    describe("When the reconduction alert is evaluated", () => {
      test("Then the phrase states the end date in day/month/year", () => {
        const m = contract({ endsOn: "2027-03-04", tacitRenewal: true });

        const alert = only(evaluate(m, "2026-11-04"), "reconduction");

        expect(alert.explanation).toBe(
          "Le marché prend fin le 04/03/2027 et sera reconduit tacitement sans décision contraire.",
        );
      });
    });
  });

  describe("Given a warranty ending on 15 December 2026", () => {
    describe("When the warranty alert is evaluated", () => {
      test("Then the phrase names the warranty end date without ISO notation", () => {
        const m = contract({ warrantyEndsOn: "2026-12-15" });

        const alert = only(evaluate(m, "2026-11-04"), "garantie");

        expect(alert.explanation).toBe(
          "La garantie prend fin le 15/12/2026 : dernier moment pour signaler une réserve.",
        );
      });
    });
  });
});

describe("guarantee", () => {
  it("triggers within 60 days of the guarantee end", () => {
    const m = contract({ warrantyEndsOn: "2026-12-15" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual(["garantie"]);
    expect(families(evaluate(m, "2026-10-01"))).toEqual([]);
  });
});

describe("six-month checkpoint", () => {
  it("triggers as the 182nd day approaches", () => {
    const m = contract({ startsOn: "2026-05-20" });
    const a = only(evaluate(m, "2026-11-04"), "point_six_mois");
    expect(a.deadlineOn).toBe("2026-11-18");
  });
});

describe("absence of purchase order", () => {
  it("counts from the last commitment", () => {
    const m = contract({
      hasPurchaseOrders: true,
      startsOn: "2026-01-05",
      lastCommitmentOn: "2026-08-01",
    });
    // Ce marché déclenche aussi le point à six mois, dépassé depuis juillet :
    // une échéance ratée reste visible tant qu'elle n'est pas traitée.
    const a = only(evaluate(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.deadlineOn).toBe("2026-10-30");
    expect(a.explanation).toContain("01/08/2026");
  });

  it("counts from the contract start when no commitment exists", () => {
    const m = contract({ hasPurchaseOrders: true, startsOn: "2026-07-01" });
    const a = only(evaluate(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.deadlineOn).toBe("2026-09-29");
    expect(a.explanation).toContain("début du marché");
  });

  it("does not concern a contract without purchase orders", () => {
    const m = contract({ startsOn: "2026-01-05" });
    expect(families(evaluate(m, "2026-11-04"))).not.toContain("sans_bon_de_commande");
  });
});

describe("portfolio", () => {
  it("sorts deadlines from the most urgent to the most distant", () => {
    const alerts = evaluatePortfolio(
      [
        contract({ reference: "A", endsOn: "2026-11-25" }),
        contract({ reference: "B", warrantyEndsOn: "2026-11-06" }),
      ],
      "2026-11-04",
    );
    expect(alerts.map((a) => a.reference)).toEqual(["B", "A"]);
  });

  it("windows are configurable", () => {
    const m = contract({ endsOn: "2026-12-20" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual([]);
    expect(
      families(
        evaluate(m, "2026-11-04", {
          reconduction: 120,
          garantie: 60,
          reception: 60,
          point_six_mois: 15,
          sans_bon_de_commande: 90,
        }),
      ),
    ).toEqual(["reception"]);
  });
});

describe("schedule of the next six months", () => {
  describe("Given a contract whose tacit reconduction falls in February 2027", () => {
    const m = contract({ endsOn: "2027-06-04", tacitRenewal: true });

    describe("When the schedule is projected on 4 November 2026", () => {
      test("Then the reconduction is announced at its trigger date", () => {
        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines.map((a) => [a.family, a.deadlineOn, a.daysRemaining])).toEqual([
          ["reconduction", "2027-02-04", 92],
        ]);
      });
    });

    describe("When looking only at the next 60 days", () => {
      test("Then the February reconduction does not appear yet", () => {
        const deadlines = evaluateSchedule([m], "2026-11-04", 60);

        expect(deadlines).toEqual([]);
      });
    });
  });

  describe("Given two contracts whose deadlines interleave in time", () => {
    describe("When the schedule is projected", () => {
      test("Then deadlines are sorted from the nearest to the farthest", () => {
        const late = contract({
          reference: "AO 26028",
          endsOn: "2027-06-04",
          tacitRenewal: false,
        });
        const early = contract({ reference: "MA 24036", warrantyEndsOn: "2026-11-26" });

        const deadlines = evaluateSchedule([late, early], "2026-11-04");

        expect(deadlines.map((a) => a.reference)).toEqual(["MA 24036", "AO 26028"]);
      });
    });
  });

  describe("Given a guarantee that ends one year later", () => {
    describe("When the schedule is projected", () => {
      test("Then it stays outside the six-month horizon", () => {
        const m = contract({ warrantyEndsOn: "2027-11-04" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines).toEqual([]);
      });
    });
  });

  describe("Given a purchase-order contract with no order for over 90 days", () => {
    describe("When the schedule is projected on 4 November 2026", () => {
      test("Then the deadline stays displayed, overdue since today and not since the horizon", () => {
        const m = contract({ hasPurchaseOrders: true, startsOn: "2026-06-01" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        const withoutOrder = deadlines.filter((a) => a.family === "sans_bon_de_commande");
        expect(withoutOrder.map((a) => [a.deadlineOn, a.daysRemaining])).toEqual([
          ["2026-08-30", -66],
        ]);
      });
    });
  });

  describe("Given a guarantee that ends exactly on the last day of the horizon", () => {
    describe("When the schedule is projected on 4 November 2026", () => {
      test("Then it is included, 183 days later", () => {
        const m = contract({ warrantyEndsOn: "2027-05-06" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines.map((a) => [a.family, a.daysRemaining])).toEqual([["garantie", 183]]);
      });
    });
  });

  describe("Given a guarantee that ends the day after the last day of the horizon", () => {
    describe("When the schedule is projected on 4 November 2026", () => {
      test("Then it does not appear yet", () => {
        const m = contract({ warrantyEndsOn: "2027-05-07" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines).toEqual([]);
      });
    });
  });
});
