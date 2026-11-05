import { describe, expect, test } from "vitest";
import {
  estEnCours,
  filtrer,
  formaterMontant,
  formaterMontantCompact,
  formaterPeriode,
  type MarcheListe,
  montantNotifie,
  services,
  synthese,
} from "@/shared/domaine/marches";

const aujourdhui = "2026-11-05";

function marche(champs: Partial<MarcheListe> = {}): MarcheListe {
  return {
    reference: "AO 25075",
    objet: "Entretien des espaces verts et des abords",
    titulaire: "Titulaire C",
    service: "Espaces verts",
    debuteLe: "2024-12-01",
    finitLe: "2027-12-01",
    montantInitial: "559200.00",
    montantAvenants: null,
    actif: true,
    solde: false,
    lots: 1,
    ...champs,
  };
}

describe("montant notifié d'un marché", () => {
  describe("Given un marché de 2 287 900 euros modifié par un avenant de 12 500,50 euros", () => {
    describe("When on calcule son montant notifié", () => {
      test("Then l'avenant s'ajoute au montant initial, au centime près", () => {
        const m = marche({ montantInitial: "2287900.00", montantAvenants: "12500.50" });

        const centimes = montantNotifie(m);

        expect(centimes).toBe(230_040_050);
      });
    });
  });

  describe("Given un marché sans montant renseigné dans CIRIL", () => {
    describe("When on calcule son montant notifié", () => {
      test("Then le montant est nul plutôt qu'inconnu", () => {
        const m = marche({ montantInitial: null, montantAvenants: null });

        const centimes = montantNotifie(m);

        expect(centimes).toBe(0);
      });
    });
  });
});

describe("marché en cours", () => {
  describe("Given un marché qui se termine aujourd'hui", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il l'est encore le jour de sa fin", () => {
        const m = marche({ finitLe: aujourdhui });

        const enCours = estEnCours(m, aujourdhui);

        expect(enCours).toBe(true);
      });
    });
  });

  describe("Given un marché terminé hier", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il ne l'est plus", () => {
        const m = marche({ finitLe: "2026-11-04" });

        const enCours = estEnCours(m, aujourdhui);

        expect(enCours).toBe(false);
      });
    });
  });

  describe("Given un marché sans date de fin", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il est tenu pour en cours, faute de fin connue", () => {
        const m = marche({ finitLe: null });

        const enCours = estEnCours(m, aujourdhui);

        expect(enCours).toBe(true);
      });
    });
  });

  describe("Given un marché désactivé dans CIRIL, dont la date de fin n'est pas atteinte", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il n'est pas en cours", () => {
        const m = marche({ actif: false });

        const enCours = estEnCours(m, aujourdhui);

        expect(enCours).toBe(false);
      });
    });
  });

  describe("Given un marché soldé, dont la date de fin n'est pas atteinte", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il n'est pas en cours", () => {
        const m = marche({ solde: true });

        const enCours = estEnCours(m, aujourdhui);

        expect(enCours).toBe(false);
      });
    });
  });
});

describe("synthèse du portefeuille", () => {
  describe("Given deux marchés en cours et un marché terminé", () => {
    const portefeuille = [
      marche({ reference: "AO 25075", lots: 2, montantInitial: "559200.00" }),
      marche({ reference: "AO 24034", lots: 1, montantInitial: "2287900.00" }),
      marche({
        reference: "MA 24036",
        lots: 4,
        montantInitial: "636900.00",
        finitLe: "2026-06-30",
      }),
    ];

    describe("When on calcule la synthèse", () => {
      test("Then seuls les marchés en cours sont comptés comme actifs", () => {
        const resultat = synthese(portefeuille, aujourdhui);

        expect(resultat.actifs).toBe(2);
      });

      test("Then les lots suivis sont ceux des marchés en cours", () => {
        const resultat = synthese(portefeuille, aujourdhui);

        expect(resultat.lots).toBe(3);
      });

      test("Then le montant notifié est celui des marchés en cours", () => {
        const resultat = synthese(portefeuille, aujourdhui);

        expect(resultat.montantNotifie).toBe(284_710_000);
      });
    });
  });

  describe("Given un portefeuille vide", () => {
    describe("When on calcule la synthèse", () => {
      test("Then tous les compteurs valent zéro", () => {
        const resultat = synthese([], aujourdhui);

        expect(resultat).toEqual({ actifs: 0, lots: 0, montantNotifie: 0 });
      });
    });
  });
});

describe("filtres de la liste des marchés", () => {
  const portefeuille = [
    marche({
      reference: "AO 25075",
      objet: "Entretien des espaces verts",
      service: "Espaces verts",
    }),
    marche({
      reference: "AO 24034",
      objet: "Travaux sur le réseau d'eau potable",
      service: "Pôle eau",
      titulaire: "Titulaire B",
    }),
    marche({
      reference: "MA 24036",
      objet: "Travaux de génie civil, station de relevage",
      service: "Travaux",
      finitLe: "2026-06-30",
    }),
  ];
  const sansCritere = { recherche: "", service: "", etat: "tous" } as const;

  describe("Given une recherche sur un mot de l'objet écrit sans accent", () => {
    describe("When on filtre", () => {
      test("Then le marché dont l'objet porte ce mot accentué est trouvé", () => {
        const criteres = { ...sansCritere, recherche: "reseau" };

        const resultat = filtrer(portefeuille, criteres, aujourdhui);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given une recherche sur un numéro de marché", () => {
    describe("When on filtre", () => {
      test("Then le marché de ce numéro est trouvé, sans tenir compte de la casse", () => {
        const criteres = { ...sansCritere, recherche: "ma 24036" };

        const resultat = filtrer(portefeuille, criteres, aujourdhui);

        expect(resultat.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });

  describe("Given le choix d'un service", () => {
    describe("When on filtre", () => {
      test("Then seuls les marchés de ce service restent", () => {
        const criteres = { ...sansCritere, service: "Pôle eau" };

        const resultat = filtrer(portefeuille, criteres, aujourdhui);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given l'état En cours", () => {
    describe("When on filtre", () => {
      test("Then le marché terminé disparaît de la liste", () => {
        const criteres = { ...sansCritere, etat: "en_cours" } as const;

        const resultat = filtrer(portefeuille, criteres, aujourdhui);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 25075", "AO 24034"]);
      });
    });
  });

  describe("Given l'état Terminés", () => {
    describe("When on filtre", () => {
      test("Then seul le marché terminé reste", () => {
        const criteres = { ...sansCritere, etat: "termines" } as const;

        const resultat = filtrer(portefeuille, criteres, aujourdhui);

        expect(resultat.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });
});

describe("services du portefeuille", () => {
  describe("Given des marchés de plusieurs services, dont un sans service", () => {
    describe("When on liste les services", () => {
      test("Then chaque service apparaît une fois, trié, sans valeur vide", () => {
        const portefeuille = [
          marche({ service: "Travaux" }),
          marche({ service: "Espaces verts" }),
          marche({ service: "Travaux" }),
          marche({ service: null }),
        ];

        const liste = services(portefeuille);

        expect(liste).toEqual(["Espaces verts", "Travaux"]);
      });
    });
  });
});

describe("présentation des montants et des périodes", () => {
  describe("Given un montant de 559 200 euros", () => {
    describe("When on le formate", () => {
      test("Then il porte l'euro après une espace insécable", () => {
        const texte = formaterMontant(55_920_000);

        expect(texte).toBe("559 200,00 €");
      });
    });
  });

  describe("Given un portefeuille de 38,4 millions d'euros", () => {
    describe("When on le formate en abrégé", () => {
      test("Then il s'écrit en millions avec une décimale", () => {
        const texte = formaterMontantCompact(3_840_000_000);

        expect(texte).toBe("38,4 M€");
      });
    });
  });

  describe("Given un montant sous le million", () => {
    describe("When on le formate en abrégé", () => {
      test("Then il garde son écriture complète", () => {
        const texte = formaterMontantCompact(31_845_000);

        expect(texte).toBe("318 450,00 €");
      });
    });
  });

  describe("Given un marché du 1er décembre 2024 au 1er décembre 2027", () => {
    describe("When on formate sa période", () => {
      test("Then elle s'écrit en mois et année", () => {
        const texte = formaterPeriode("2024-12-01", "2027-12-01");

        expect(texte).toBe("12/2024 au 12/2027");
      });
    });
  });

  describe("Given un marché sans aucune date", () => {
    describe("When on formate sa période", () => {
      test("Then elle est dite non renseignée", () => {
        const texte = formaterPeriode(null, null);

        expect(texte).toBe("Non renseignée");
      });
    });
  });
});
