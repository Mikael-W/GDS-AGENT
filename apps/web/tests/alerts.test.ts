import { describe, expect, test } from "vitest";

import {
  type AlertListItem,
  alertLink,
  deadlineLabel,
  departments,
  filter,
  formatDate,
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
    explanation: "Reconduction tacite au 09/12/2026, préavis de non-reconduction de 1 mois.",
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

const toutes = { view: "a_traiter", service: "", family: "", period: "toutes" } as const;

describe("urgence d'une alerte", () => {
  describe("Given une alerte dont l'échéance est passée depuis 16 jours", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle est en retard", () => {
        const a = alert({ daysRemaining: -16 });

        const niveau = urgency(a);

        expect(niveau).toBe("retard");
        expect(isOverdue(a)).toBe(true);
      });
    });
  });

  describe("Given une alerte à 30 jours de l'échéance", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle demande de l'attention", () => {
        const a = alert({ daysRemaining: 30 });

        const niveau = urgency(a);

        expect(niveau).toBe("attention");
      });
    });
  });

  describe("Given une alerte à 61 jours de l'échéance", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle est simplement à surveiller", () => {
        const a = alert({ daysRemaining: 61 });

        const niveau = urgency(a);

        expect(niveau).toBe("information");
      });
    });
  });

  describe("Given une alerte dont l'échéance tombe aujourd'hui", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle n'est pas encore dépassée", () => {
        const a = alert({ daysRemaining: 0 });

        const overdue = isOverdue(a);

        expect(overdue).toBe(false);
      });
    });
  });
});

describe("synthèse des alertes", () => {
  describe("Given six alertes dont deux dépassées", () => {
    describe("When on compte les alertes", () => {
      test("Then six sont à traiter dont deux dépassées", () => {
        const summary = summarize(portfolio);

        expect(summary).toEqual({ toTreat: 6, overdue: 2 });
      });
    });
  });
});

describe("filtres de la liste des alertes", () => {
  describe("Given six alertes à traiter", () => {
    describe("When on garde les alertes dépassées", () => {
      test("Then seules les deux échéances passées restent", () => {
        const resultat = filter(portfolio, { ...toutes, view: "depassees" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "AO 24034"]);
      });
    });

    describe("When on choisit le service Travaux", () => {
      test("Then seules ses trois alertes restent", () => {
        const resultat = filter(portfolio, { ...toutes, service: "Travaux" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });

    describe("When on choisit la famille reconduction", () => {
      test("Then seules les deux reconductions restent", () => {
        const resultat = filter(portfolio, { ...toutes, family: "reconduction" });

        expect(resultat.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When on regarde les 30 prochains jours", () => {
      test("Then les alertes dépassées restent visibles avec celles qui tombent d'ici un mois", () => {
        const resultat = filter(portfolio, { ...toutes, period: "30" });

        expect(resultat.map((a) => a.reference)).toEqual([
          "MA 24029",
          "AO 24034",
          "AO 25075",
          "MA 24036",
          "MA 26045",
        ]);
      });
    });

    describe("When on combine le service Travaux et la période de 30 jours", () => {
      test("Then les deux critères s'appliquent ensemble", () => {
        const resultat = filter(portfolio, { ...toutes, service: "Travaux", period: "30" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });
  });
});

describe("services proposés dans le filtre", () => {
  describe("Given des alertes de trois services, dont une sans service", () => {
    describe("When on liste les services", () => {
      test("Then chaque service apparaît une fois, par ordre alphabétique", () => {
        const liste = departments([...portfolio, alert({ service: null })]);

        expect(liste).toEqual(["Espaces verts", "Pôle eau", "Travaux"]);
      });
    });
  });
});

describe("libellé d'échéance", () => {
  describe("Given une échéance dépassée de 48 jours", () => {
    describe("When on la formule", () => {
      test("Then on lit qu'elle est dépassée de 48 jours", () => {
        const label = deadlineLabel(-48);

        expect(label).toBe("Dépassée de 48 jours");
      });
    });
  });

  describe("Given une échéance dépassée d'un jour", () => {
    describe("When on la formule", () => {
      test("Then le mot jour reste au singulier", () => {
        const label = deadlineLabel(-1);

        expect(label).toBe("Dépassée de 1 jour");
      });
    });
  });

  describe("Given une échéance dans 4 jours", () => {
    describe("When on la formule", () => {
      test("Then on lit qu'elle tombe dans 4 jours", () => {
        const label = deadlineLabel(4);

        expect(label).toBe("Dans 4 jours");
      });
    });
  });

  describe("Given une échéance aujourd'hui", () => {
    describe("When on la formule", () => {
      test("Then on lit aujourd'hui", () => {
        const label = deadlineLabel(0);

        expect(label).toBe("Aujourd'hui");
      });
    });
  });
});

describe("date affichée", () => {
  describe("Given l'échéance du 18 septembre 2026", () => {
    describe("When on la formate", () => {
      test("Then elle s'écrit jour, mois, année", () => {
        const text = formatDate("2026-09-18");

        expect(text).toBe("18/09/2026");
      });
    });
  });
});

describe("titre de la liste", () => {
  describe("Given l'onglet À traiter avec six alertes", () => {
    describe("When on formule le titre", () => {
      test("Then on lit six alertes à traiter", () => {
        const title = listTitle("a_traiter", 6);

        expect(title).toBe("6 alertes à traiter");
      });
    });
  });

  describe("Given l'onglet Dont dépassées avec deux alertes", () => {
    describe("When on formule le titre", () => {
      test("Then on lit deux alertes dépassées, accordées au pluriel", () => {
        const title = listTitle("depassees", 2);

        expect(title).toBe("2 alertes dépassées");
      });
    });
  });

  describe("Given l'onglet Dont dépassées avec une seule alerte", () => {
    describe("When on formule le titre", () => {
      test("Then on lit une alerte dépassée, au singulier", () => {
        const title = listTitle("depassees", 1);

        expect(title).toBe("1 alerte dépassée");
      });
    });
  });
});

describe("date absente dans CIRIL", () => {
  describe("Given un marché dont la date de notification n'est pas renseignée", () => {
    describe("When on la formate", () => {
      test("Then on lit qu'elle n'est pas renseignée", () => {
        const text = formatDate(null);

        expect(text).toBe("Non renseignée");
      });
    });
  });
});

describe("lien vers le détail d'une alerte", () => {
  describe("Given l'alerte de reconduction du marché AO 25075", () => {
    describe("When on construit son lien", () => {
      test("Then la référence est protégée pour l'adresse et la famille suit", () => {
        const a = alert({ reference: "AO 25075", family: "reconduction" });

        const lien = alertLink(a);

        expect(lien).toBe("/alertes/AO%2025075/reconduction");
      });
    });
  });
});
