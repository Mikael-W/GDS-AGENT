import { describe, expect, it } from "vitest";

import {
  type Alerte,
  evaluer,
  evaluerPortefeuille,
  type MarcheSuivi,
  pointMensuel,
} from "@/lib/echeances";

const BASE: MarcheSuivi = {
  reference: "MA 26045",
  actif: true,
  solde: false,
  aBonsDeCommande: false,
  reconductible: false,
  preavisReconductionMois: null,
  notifieLe: null,
  debuteLe: null,
  finitLe: null,
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
    const m = marche({ solde: true, reconductible: true, finitLe: "2026-12-01" });
    expect(evaluer(m, "2026-11-05")).toEqual([]);
  });

  it("un marché inactif ne produit plus rien", () => {
    const m = marche({ actif: false, reconductible: true, finitLe: "2026-12-01" });
    expect(evaluer(m, "2026-11-05")).toEqual([]);
  });
});

describe("reconduction", () => {
  it("s'ouvre au préavis de 3 mois retenu par le service", () => {
    const m = marche({ reconductible: true, finitLe: "2027-02-09" });
    expect(familles(evaluer(m, "2026-11-08"))).toEqual([]);
    const a = seule(evaluer(m, "2026-11-09"), "reconduction");
    expect(a.echeanceLe).toBe("2026-11-09");
  });

  it("suit le préavis du CCAP quand il diffère", () => {
    const m = marche({ reconductible: true, finitLe: "2026-12-09", preavisReconductionMois: 1 });
    expect(familles(evaluer(m, "2026-11-08"))).toEqual([]);
    const a = seule(evaluer(m, "2026-11-09"), "reconduction");
    expect(a.echeanceLe).toBe("2026-11-09");
    expect(a.explication).toContain("1 mois");
  });

  it("reste visible une fois la date limite passée", () => {
    const m = marche({ reconductible: true, finitLe: "2027-02-09" });
    const a = seule(evaluer(m, "2026-12-09"), "reconduction");
    expect(a.joursRestants).toBe(-30);
  });

  it("ne dit rien sur un marché non reconductible", () => {
    const m = marche({ finitLe: "2027-02-09" });
    expect(familles(evaluer(m, "2026-11-09"))).not.toContain("reconduction");
  });
});

describe("réception manquante", () => {
  it("première relance trois mois après la fin de marché", () => {
    const m = marche({ finitLe: "2026-08-05" });
    expect(familles(evaluer(m, "2026-11-04"))).toEqual([]);
    const a = seule(evaluer(m, "2026-11-05"), "reception_manquante");
    expect(a.echeanceLe).toBe("2026-11-05");
    expect(a.relances).toBe(0);
  });

  it("relance ensuite tous les trois mois, aux dates exactes", () => {
    const m = marche({ finitLe: "2026-03-18" });
    const a = seule(evaluer(m, "2026-11-05"), "reception_manquante");
    expect(a.echeanceLe).toBe("2026-09-18");
    expect(a.relances).toBe(1);
  });

  it("se tait dès que la réception est enregistrée", () => {
    const m = marche({ finitLe: "2026-03-18", receptionneLe: "2026-04-02" });
    expect(familles(evaluer(m, "2026-11-05"))).not.toContain("reception_manquante");
  });
});

describe("retenue de garantie", () => {
  it("se libère un an après la réception", () => {
    const m = marche({ receptionneLe: "2025-11-26" });
    const a = seule(evaluer(m, "2026-11-05"), "retenue_garantie");
    expect(a.echeanceLe).toBe("2026-11-26");
    expect(a.joursRestants).toBe(21);
  });
});

describe("sans bon de commande", () => {
  it("première relance quinze jours après la notification", () => {
    const m = marche({ aBonsDeCommande: true, notifieLe: "2026-10-22" });
    expect(familles(evaluer(m, "2026-11-05"))).toEqual([]);
    const a = seule(evaluer(m, "2026-11-06"), "sans_bon_de_commande");
    expect(a.echeanceLe).toBe("2026-11-06");
  });

  it("relance ensuite tous les quinze jours", () => {
    const m = marche({ aBonsDeCommande: true, notifieLe: "2026-10-05" });
    const a = seule(evaluer(m, "2026-11-05"), "sans_bon_de_commande");
    expect(a.relances).toBe(1);
    expect(a.echeanceLe).toBe("2026-11-04");
  });

  it("se tait dès qu'un bon de commande existe", () => {
    const m = marche({
      aBonsDeCommande: true,
      notifieLe: "2026-10-05",
      dernierEngagementLe: "2026-10-23",
    });
    expect(familles(evaluer(m, "2026-11-05"))).not.toContain("sans_bon_de_commande");
  });
});

describe("point à six mois", () => {
  it("s'ouvre cinq mois après le début de la période en cours", () => {
    const m = marche({ debuteLe: "2026-06-10" });
    expect(familles(evaluer(m, "2026-11-09"))).toEqual([]);
    const a = seule(evaluer(m, "2026-11-10"), "point_six_mois");
    expect(a.echeanceLe).toBe("2026-12-10");
  });

  it("se ferme passé les six mois", () => {
    const m = marche({ debuteLe: "2026-01-10" });
    expect(familles(evaluer(m, "2026-11-05"))).not.toContain("point_six_mois");
  });

  it("repart du début de la période reconduite", () => {
    const m = marche({ notifieLe: "2024-12-10", debuteLe: "2026-06-10" });
    const a = seule(evaluer(m, "2026-11-10"), "point_six_mois");
    expect(a.explication).toContain("2026-06-10");
  });
});

describe("point mensuel du 1er", () => {
  it("retient les marchés atteignant six mois le mois suivant", () => {
    const marches = [
      marche({ reference: "A", debuteLe: "2026-06-10" }),
      marche({ reference: "B", debuteLe: "2026-07-02" }),
      marche({ reference: "C", debuteLe: "2026-05-20" }),
    ];
    const retenus = pointMensuel(marches, "2026-11-01").map((a) => a.reference);
    expect(retenus).toEqual(["A"]);
  });

  it("ignore un marché soldé", () => {
    const marches = [marche({ reference: "A", debuteLe: "2026-06-10", solde: true })];
    expect(pointMensuel(marches, "2026-11-01")).toEqual([]);
  });
});

describe("portefeuille", () => {
  it("classe de l'échéance la plus urgente à la plus lointaine", () => {
    const alertes = evaluerPortefeuille(
      [
        marche({ reference: "A", receptionneLe: "2025-11-26" }),
        marche({ reference: "B", finitLe: "2026-05-05" }),
      ],
      "2026-11-05",
    );
    expect(alertes.map((a) => a.reference)).toEqual(["B", "A"]);
  });

  it("les réglages sont paramétrables", () => {
    const m = marche({ reconductible: true, finitLe: "2027-02-09" });
    expect(familles(evaluer(m, "2026-10-09"))).toEqual([]);
    expect(
      familles(
        evaluer(m, "2026-10-09", {
          preavisReconductionMois: 4,
          receptionPremiereRelanceMois: 3,
          receptionRelanceMois: 3,
          retenueApresReceptionMois: 12,
          bonDeCommandePremiereRelanceJours: 15,
          bonDeCommandeRelanceJours: 15,
          pointMoisAnnonce: 5,
        }),
      ),
    ).toEqual(["reconduction"]);
  });
});
