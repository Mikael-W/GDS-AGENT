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

describe("marchés hors suivi", () => {
  it("un marché soldé ne produit plus rien", () => {
    const m = contract({ settled: true, endsOn: "2026-12-01", tacitRenewal: true });
    expect(evaluate(m, "2026-11-04")).toEqual([]);
  });

  it("un marché inactif ne produit plus rien", () => {
    const m = contract({ active: false, endsOn: "2026-12-01", tacitRenewal: true });
    expect(evaluate(m, "2026-11-04")).toEqual([]);
  });
});

describe("reconduction", () => {
  it("se déclenche à l'entrée dans la fenêtre de 120 jours", () => {
    const m = contract({ endsOn: "2027-03-04", tacitRenewal: true });
    expect(families(evaluate(m, "2026-11-03"))).toEqual([]);
    expect(families(evaluate(m, "2026-11-04"))).toContain("reconduction");
  });

  it("reste visible une fois l'échéance dépassée", () => {
    const m = contract({ endsOn: "2027-03-04", tacitRenewal: true });
    const a = only(evaluate(m, "2026-12-04"), "reconduction");
    expect(a.daysRemaining).toBe(-30);
  });

  it("distingue la reconduction tacite de l'expresse", () => {
    const tacite = evaluate(contract({ endsOn: "2027-01-01", tacitRenewal: true }), "2026-11-04");
    const expresse = evaluate(
      contract({ endsOn: "2027-01-01", tacitRenewal: false }),
      "2026-11-04",
    );
    expect(only(tacite, "reconduction").explanation).toContain("tacite");
    expect(only(expresse, "reconduction").explanation).toContain("expresse");
  });

  it("ne dit rien quand le mode de reconduction est inconnu", () => {
    const m = contract({ endsOn: "2027-01-01", tacitRenewal: null });
    expect(families(evaluate(m, "2026-11-04"))).not.toContain("reconduction");
  });
});

describe("réception", () => {
  it("se déclenche dans les 30 jours de la fin, sans réception enregistrée", () => {
    const m = contract({ endsOn: "2026-11-20" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual(["reception"]);
  });

  it("se tait dès que la réception est enregistrée", () => {
    const m = contract({ endsOn: "2026-11-20", receivedOn: "2026-11-02" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual([]);
  });
});

describe("garantie", () => {
  it("se déclenche dans les 60 jours de la fin de garantie", () => {
    const m = contract({ warrantyEndsOn: "2026-12-15" });
    expect(families(evaluate(m, "2026-11-04"))).toEqual(["garantie"]);
    expect(families(evaluate(m, "2026-10-01"))).toEqual([]);
  });
});

describe("point à six mois", () => {
  it("se déclenche à l'approche du cent quatre-vingt-deuxième jour", () => {
    const m = contract({ startsOn: "2026-05-20" });
    const a = only(evaluate(m, "2026-11-04"), "point_six_mois");
    expect(a.deadlineOn).toBe("2026-11-18");
  });
});

describe("absence de bon de commande", () => {
  it("compte depuis le dernier engagement", () => {
    const m = contract({
      hasPurchaseOrders: true,
      startsOn: "2026-01-05",
      lastCommitmentOn: "2026-08-01",
    });
    // Ce marché déclenche aussi le point à six mois, dépassé depuis juillet :
    // une échéance ratée reste visible tant qu'elle n'est pas traitée.
    const a = only(evaluate(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.deadlineOn).toBe("2026-10-30");
    expect(a.explanation).toContain("2026-08-01");
  });

  it("compte depuis le début du marché quand aucun engagement n'existe", () => {
    const m = contract({ hasPurchaseOrders: true, startsOn: "2026-07-01" });
    const a = only(evaluate(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.deadlineOn).toBe("2026-09-29");
    expect(a.explanation).toContain("début du marché");
  });

  it("ne concerne pas un marché sans bons de commande", () => {
    const m = contract({ startsOn: "2026-01-05" });
    expect(families(evaluate(m, "2026-11-04"))).not.toContain("sans_bon_de_commande");
  });
});

describe("portefeuille", () => {
  it("classe de l'échéance la plus urgente à la plus lointaine", () => {
    const alerts = evaluatePortfolio(
      [
        contract({ reference: "A", endsOn: "2026-11-25" }),
        contract({ reference: "B", warrantyEndsOn: "2026-11-06" }),
      ],
      "2026-11-04",
    );
    expect(alerts.map((a) => a.reference)).toEqual(["B", "A"]);
  });

  it("les fenêtres sont paramétrables", () => {
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

describe("échéancier des six prochains mois", () => {
  describe("Given un marché dont la reconduction tacite tombe en février 2027", () => {
    const m = contract({ endsOn: "2027-06-04", tacitRenewal: true });

    describe("When on projette l'échéancier au 4 novembre 2026", () => {
      test("Then la reconduction est annoncée à sa date de déclenchement", () => {
        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines.map((a) => [a.family, a.deadlineOn, a.daysRemaining])).toEqual([
          ["reconduction", "2027-02-04", 92],
        ]);
      });
    });

    describe("When on regarde seulement les 60 prochains jours", () => {
      test("Then la reconduction de février n'y figure pas encore", () => {
        const deadlines = evaluateSchedule([m], "2026-11-04", 60);

        expect(deadlines).toEqual([]);
      });
    });
  });

  describe("Given deux marchés dont les échéances se croisent dans le temps", () => {
    describe("When on projette l'échéancier", () => {
      test("Then les échéances sont rangées de la plus proche à la plus lointaine", () => {
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

  describe("Given une garantie qui prend fin un an plus tard", () => {
    describe("When on projette l'échéancier", () => {
      test("Then elle reste hors de l'horizon de six mois", () => {
        const m = contract({ warrantyEndsOn: "2027-11-04" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines).toEqual([]);
      });
    });
  });

  describe("Given un marché à bons de commande sans aucun bon depuis plus de 90 jours", () => {
    describe("When on projette l'échéancier au 4 novembre 2026", () => {
      test("Then l'échéance reste affichée, dépassée depuis aujourd'hui et non depuis l'horizon", () => {
        const m = contract({ hasPurchaseOrders: true, startsOn: "2026-06-01" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        const withoutOrder = deadlines.filter((a) => a.family === "sans_bon_de_commande");
        expect(withoutOrder.map((a) => [a.deadlineOn, a.daysRemaining])).toEqual([
          ["2026-08-30", -66],
        ]);
      });
    });
  });

  describe("Given une garantie qui prend fin exactement au dernier jour de l'horizon", () => {
    describe("When on projette l'échéancier au 4 novembre 2026", () => {
      test("Then elle est incluse, 183 jours plus tard", () => {
        const m = contract({ warrantyEndsOn: "2027-05-06" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines.map((a) => [a.family, a.daysRemaining])).toEqual([["garantie", 183]]);
      });
    });
  });

  describe("Given une garantie qui prend fin le lendemain du dernier jour de l'horizon", () => {
    describe("When on projette l'échéancier au 4 novembre 2026", () => {
      test("Then elle n'y figure pas encore", () => {
        const m = contract({ warrantyEndsOn: "2027-05-07" });

        const deadlines = evaluateSchedule([m], "2026-11-04");

        expect(deadlines).toEqual([]);
      });
    });
  });
});
