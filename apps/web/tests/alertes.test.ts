import { describe, expect, test } from "vitest";

import {
  type AlerteListe,
  estDepassee,
  filtrer,
  formaterDate,
  libelleEcheance,
  services,
  synthese,
  titreListe,
  urgence,
} from "@/shared/domaine/alertes";

function alerte(champs: Partial<AlerteListe> = {}): AlerteListe {
  return {
    famille: "reconduction",
    reference: "AO 25075",
    echeanceLe: "2026-11-09",
    joursRestants: 4,
    explication: "Reconduction tacite au 09/12/2026, préavis de non-reconduction de 1 mois.",
    objet: "Entretien des espaces verts et des abords",
    service: "Espaces verts",
    ...champs,
  };
}

const portefeuille = [
  alerte({ reference: "MA 24029", famille: "reception", joursRestants: -48, service: "Travaux" }),
  alerte({
    reference: "AO 24034",
    famille: "sans_bon_de_commande",
    joursRestants: -16,
    service: "Pôle eau",
  }),
  alerte({
    reference: "AO 25075",
    famille: "reconduction",
    joursRestants: 4,
    service: "Espaces verts",
  }),
  alerte({ reference: "MA 24036", famille: "garantie", joursRestants: 21, service: "Travaux" }),
  alerte({
    reference: "MA 26045",
    famille: "point_six_mois",
    joursRestants: 26,
    service: "Travaux",
  }),
  alerte({
    reference: "AO 26028",
    famille: "reconduction",
    joursRestants: 61,
    service: "Espaces verts",
  }),
];

const toutes = { vue: "a_traiter", service: "", famille: "", periode: "toutes" } as const;

describe("urgence d'une alerte", () => {
  describe("Given une alerte dont l'échéance est passée depuis 16 jours", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle est en retard", () => {
        const a = alerte({ joursRestants: -16 });

        const niveau = urgence(a);

        expect(niveau).toBe("retard");
        expect(estDepassee(a)).toBe(true);
      });
    });
  });

  describe("Given une alerte à 30 jours de l'échéance", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle demande de l'attention", () => {
        const a = alerte({ joursRestants: 30 });

        const niveau = urgence(a);

        expect(niveau).toBe("attention");
      });
    });
  });

  describe("Given une alerte à 61 jours de l'échéance", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle est simplement à surveiller", () => {
        const a = alerte({ joursRestants: 61 });

        const niveau = urgence(a);

        expect(niveau).toBe("information");
      });
    });
  });

  describe("Given une alerte dont l'échéance tombe aujourd'hui", () => {
    describe("When on évalue son urgence", () => {
      test("Then elle n'est pas encore dépassée", () => {
        const a = alerte({ joursRestants: 0 });

        const depassee = estDepassee(a);

        expect(depassee).toBe(false);
      });
    });
  });
});

describe("synthèse des alertes", () => {
  describe("Given six alertes dont deux dépassées", () => {
    describe("When on compte les alertes", () => {
      test("Then six sont à traiter dont deux dépassées", () => {
        const resume = synthese(portefeuille);

        expect(resume).toEqual({ aTraiter: 6, depassees: 2 });
      });
    });
  });
});

describe("filtres de la liste des alertes", () => {
  describe("Given six alertes à traiter", () => {
    describe("When on garde les alertes dépassées", () => {
      test("Then seules les deux échéances passées restent", () => {
        const resultat = filtrer(portefeuille, { ...toutes, vue: "depassees" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "AO 24034"]);
      });
    });

    describe("When on choisit le service Travaux", () => {
      test("Then seules ses trois alertes restent", () => {
        const resultat = filtrer(portefeuille, { ...toutes, service: "Travaux" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });

    describe("When on choisit la famille reconduction", () => {
      test("Then seules les deux reconductions restent", () => {
        const resultat = filtrer(portefeuille, { ...toutes, famille: "reconduction" });

        expect(resultat.map((a) => a.reference)).toEqual(["AO 25075", "AO 26028"]);
      });
    });

    describe("When on regarde les 30 prochains jours", () => {
      test("Then les alertes dépassées restent visibles avec celles qui tombent d'ici un mois", () => {
        const resultat = filtrer(portefeuille, { ...toutes, periode: "30" });

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
        const resultat = filtrer(portefeuille, { ...toutes, service: "Travaux", periode: "30" });

        expect(resultat.map((a) => a.reference)).toEqual(["MA 24029", "MA 24036", "MA 26045"]);
      });
    });
  });
});

describe("services proposés dans le filtre", () => {
  describe("Given des alertes de trois services, dont une sans service", () => {
    describe("When on liste les services", () => {
      test("Then chaque service apparaît une fois, par ordre alphabétique", () => {
        const liste = services([...portefeuille, alerte({ service: null })]);

        expect(liste).toEqual(["Espaces verts", "Pôle eau", "Travaux"]);
      });
    });
  });
});

describe("libellé d'échéance", () => {
  describe("Given une échéance dépassée de 48 jours", () => {
    describe("When on la formule", () => {
      test("Then on lit qu'elle est dépassée de 48 jours", () => {
        const libelle = libelleEcheance(-48);

        expect(libelle).toBe("Dépassée de 48 jours");
      });
    });
  });

  describe("Given une échéance dépassée d'un jour", () => {
    describe("When on la formule", () => {
      test("Then le mot jour reste au singulier", () => {
        const libelle = libelleEcheance(-1);

        expect(libelle).toBe("Dépassée de 1 jour");
      });
    });
  });

  describe("Given une échéance dans 4 jours", () => {
    describe("When on la formule", () => {
      test("Then on lit qu'elle tombe dans 4 jours", () => {
        const libelle = libelleEcheance(4);

        expect(libelle).toBe("Dans 4 jours");
      });
    });
  });

  describe("Given une échéance aujourd'hui", () => {
    describe("When on la formule", () => {
      test("Then on lit aujourd'hui", () => {
        const libelle = libelleEcheance(0);

        expect(libelle).toBe("Aujourd'hui");
      });
    });
  });
});

describe("date affichée", () => {
  describe("Given l'échéance du 18 septembre 2026", () => {
    describe("When on la formate", () => {
      test("Then elle s'écrit jour, mois, année", () => {
        const texte = formaterDate("2026-09-18");

        expect(texte).toBe("18/09/2026");
      });
    });
  });
});

describe("titre de la liste", () => {
  describe("Given l'onglet À traiter avec six alertes", () => {
    describe("When on formule le titre", () => {
      test("Then on lit six alertes à traiter", () => {
        const titre = titreListe("a_traiter", 6);

        expect(titre).toBe("6 alertes à traiter");
      });
    });
  });

  describe("Given l'onglet Dont dépassées avec deux alertes", () => {
    describe("When on formule le titre", () => {
      test("Then on lit deux alertes dépassées, accordées au pluriel", () => {
        const titre = titreListe("depassees", 2);

        expect(titre).toBe("2 alertes dépassées");
      });
    });
  });

  describe("Given l'onglet Dont dépassées avec une seule alerte", () => {
    describe("When on formule le titre", () => {
      test("Then on lit une alerte dépassée, au singulier", () => {
        const titre = titreListe("depassees", 1);

        expect(titre).toBe("1 alerte dépassée");
      });
    });
  });
});
