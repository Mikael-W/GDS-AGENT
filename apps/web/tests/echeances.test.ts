import { describe, expect, it } from "vitest";

import {
  type Alerte,
  evaluer,
  evaluerPortefeuille,
  type MarcheSuivi,
} from "@/shared/domaine/echeances";

const BASE: MarcheSuivi = {
  reference: "M-2026-001",
  actif: true,
  solde: false,
  aBonsDeCommande: false,
  reconductionTacite: null,
  debuteLe: null,
  finitLe: null,
  garantieFinitLe: null,
  receptionneLe: null,
  dernierEngagementLe: null,
};

function marche(champs: Partial<MarcheSuivi>): MarcheSuivi {
  return { ...BASE, ...champs };
}

function familles(alertes: Alerte[]): string[] {
  return alertes.map((a) => a.famille).sort();
}

function seule(alertes: Alerte[], famille: string): Alerte {
  const trouvee = alertes.find((a) => a.famille === famille);
  if (!trouvee) throw new Error(`Aucune alerte ${famille} parmi ${familles(alertes).join(", ")}`);
  return trouvee;
}

describe("marchés hors suivi", () => {
  it("un marché soldé ne produit plus rien", () => {
    const m = marche({ solde: true, finitLe: "2026-12-01", reconductionTacite: true });
    expect(evaluer(m, "2026-11-04")).toEqual([]);
  });

  it("un marché inactif ne produit plus rien", () => {
    const m = marche({ actif: false, finitLe: "2026-12-01", reconductionTacite: true });
    expect(evaluer(m, "2026-11-04")).toEqual([]);
  });
});

describe("reconduction", () => {
  it("se déclenche à l'entrée dans la fenêtre de 120 jours", () => {
    const m = marche({ finitLe: "2027-03-04", reconductionTacite: true });
    expect(familles(evaluer(m, "2026-11-03"))).toEqual([]);
    expect(familles(evaluer(m, "2026-11-04"))).toContain("reconduction");
  });

  it("reste visible une fois l'échéance dépassée", () => {
    const m = marche({ finitLe: "2027-03-04", reconductionTacite: true });
    const a = seule(evaluer(m, "2026-12-04"), "reconduction");
    expect(a.joursRestants).toBe(-30);
  });

  it("distingue la reconduction tacite de l'expresse", () => {
    const tacite = evaluer(
      marche({ finitLe: "2027-01-01", reconductionTacite: true }),
      "2026-11-04",
    );
    const expresse = evaluer(
      marche({ finitLe: "2027-01-01", reconductionTacite: false }),
      "2026-11-04",
    );
    expect(seule(tacite, "reconduction").explication).toContain("tacite");
    expect(seule(expresse, "reconduction").explication).toContain("expresse");
  });

  it("ne dit rien quand le mode de reconduction est inconnu", () => {
    const m = marche({ finitLe: "2027-01-01", reconductionTacite: null });
    expect(familles(evaluer(m, "2026-11-04"))).not.toContain("reconduction");
  });
});

describe("réception", () => {
  it("se déclenche dans les 30 jours de la fin, sans réception enregistrée", () => {
    const m = marche({ finitLe: "2026-11-20" });
    expect(familles(evaluer(m, "2026-11-04"))).toEqual(["reception"]);
  });

  it("se tait dès que la réception est enregistrée", () => {
    const m = marche({ finitLe: "2026-11-20", receptionneLe: "2026-11-02" });
    expect(familles(evaluer(m, "2026-11-04"))).toEqual([]);
  });
});

describe("garantie", () => {
  it("se déclenche dans les 60 jours de la fin de garantie", () => {
    const m = marche({ garantieFinitLe: "2026-12-15" });
    expect(familles(evaluer(m, "2026-11-04"))).toEqual(["garantie"]);
    expect(familles(evaluer(m, "2026-10-01"))).toEqual([]);
  });
});

describe("point à six mois", () => {
  it("se déclenche à l'approche du cent quatre-vingt-deuxième jour", () => {
    const m = marche({ debuteLe: "2026-05-20" });
    const a = seule(evaluer(m, "2026-11-04"), "point_six_mois");
    expect(a.echeanceLe).toBe("2026-11-18");
  });
});

describe("absence de bon de commande", () => {
  it("compte depuis le dernier engagement", () => {
    const m = marche({
      aBonsDeCommande: true,
      debuteLe: "2026-01-05",
      dernierEngagementLe: "2026-08-01",
    });
    // Ce marché déclenche aussi le point à six mois, dépassé depuis juillet :
    // une échéance ratée reste visible tant qu'elle n'est pas traitée.
    const a = seule(evaluer(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.echeanceLe).toBe("2026-10-30");
    expect(a.explication).toContain("2026-08-01");
  });

  it("compte depuis le début du marché quand aucun engagement n'existe", () => {
    const m = marche({ aBonsDeCommande: true, debuteLe: "2026-07-01" });
    const a = seule(evaluer(m, "2026-11-04"), "sans_bon_de_commande");
    expect(a.echeanceLe).toBe("2026-09-29");
    expect(a.explication).toContain("début du marché");
  });

  it("ne concerne pas un marché sans bons de commande", () => {
    const m = marche({ debuteLe: "2026-01-05" });
    expect(familles(evaluer(m, "2026-11-04"))).not.toContain("sans_bon_de_commande");
  });
});

describe("portefeuille", () => {
  it("classe de l'échéance la plus urgente à la plus lointaine", () => {
    const alertes = evaluerPortefeuille(
      [
        marche({ reference: "A", finitLe: "2026-11-25" }),
        marche({ reference: "B", garantieFinitLe: "2026-11-06" }),
      ],
      "2026-11-04",
    );
    expect(alertes.map((a) => a.reference)).toEqual(["B", "A"]);
  });

  it("les fenêtres sont paramétrables", () => {
    const m = marche({ finitLe: "2026-12-20" });
    expect(familles(evaluer(m, "2026-11-04"))).toEqual([]);
    expect(
      familles(
        evaluer(m, "2026-11-04", {
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
