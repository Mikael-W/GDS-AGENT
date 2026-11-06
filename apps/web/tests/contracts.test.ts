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

describe("montant notifié d'un marché", () => {
  describe("Given un marché de 2 287 900 euros modifié par un avenant de 12 500,50 euros", () => {
    describe("When on calcule son montant notifié", () => {
      test("Then l'avenant s'ajoute au montant initial, au centime près", () => {
        const m = contract({ initialAmount: "2287900.00", amendmentsAmount: "12500.50" });

        const centimes = notifiedAmount(m);

        expect(centimes).toBe(230_040_050);
      });
    });
  });

  describe("Given un marché sans montant renseigné dans CIRIL", () => {
    describe("When on calcule son montant notifié", () => {
      test("Then le montant est nul plutôt qu'inconnu", () => {
        const m = contract({ initialAmount: null, amendmentsAmount: null });

        const centimes = notifiedAmount(m);

        expect(centimes).toBe(0);
      });
    });
  });
});

describe("marché en cours", () => {
  describe("Given un marché qui se termine aujourd'hui", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il l'est encore le jour de sa fin", () => {
        const m = contract({ endsOn: today });

        const busy = isOngoing(m, today);

        expect(busy).toBe(true);
      });
    });
  });

  describe("Given un marché terminé hier", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il ne l'est plus", () => {
        const m = contract({ endsOn: "2026-11-04" });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });

  describe("Given un marché sans date de fin", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il est tenu pour en cours, faute de fin connue", () => {
        const m = contract({ endsOn: null });

        const busy = isOngoing(m, today);

        expect(busy).toBe(true);
      });
    });
  });

  describe("Given un marché désactivé dans CIRIL, dont la date de fin n'est pas atteinte", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il n'est pas en cours", () => {
        const m = contract({ active: false });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });

  describe("Given un marché soldé, dont la date de fin n'est pas atteinte", () => {
    describe("When on regarde s'il est en cours", () => {
      test("Then il n'est pas en cours", () => {
        const m = contract({ settled: true });

        const busy = isOngoing(m, today);

        expect(busy).toBe(false);
      });
    });
  });
});

describe("synthèse du portefeuille", () => {
  describe("Given deux marchés en cours et un marché terminé", () => {
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

    describe("When on calcule la synthèse", () => {
      test("Then seuls les marchés en cours sont comptés comme actifs", () => {
        const resultat = summarize(portfolio, today);

        expect(resultat.active).toBe(2);
      });

      test("Then les lots suivis sont ceux des marchés en cours", () => {
        const resultat = summarize(portfolio, today);

        expect(resultat.lots).toBe(3);
      });

      test("Then le montant notifié est celui des marchés en cours", () => {
        const resultat = summarize(portfolio, today);

        expect(resultat.notifiedAmount).toBe(284_710_000);
      });
    });
  });

  describe("Given un portefeuille vide", () => {
    describe("When on calcule la synthèse", () => {
      test("Then tous les compteurs valent zéro", () => {
        const resultat = summarize([], today);

        expect(resultat).toEqual({ active: 0, lots: 0, notifiedAmount: 0 });
      });
    });
  });
});

describe("filtres de la liste des marchés", () => {
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

  describe("Given une recherche sur un mot de l'objet écrit sans accent", () => {
    describe("When on filtre", () => {
      test("Then le marché dont l'objet porte ce mot accentué est trouvé", () => {
        const criteria = { ...noCriteria, search: "reseau" };

        const resultat = filter(portfolio, criteria, today);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given une recherche sur un numéro de marché", () => {
    describe("When on filtre", () => {
      test("Then le marché de ce numéro est trouvé, sans tenir compte de la casse", () => {
        const criteria = { ...noCriteria, search: "ma 24036" };

        const resultat = filter(portfolio, criteria, today);

        expect(resultat.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });

  describe("Given le choix d'un service", () => {
    describe("When on filtre", () => {
      test("Then seuls les marchés de ce service restent", () => {
        const criteria = { ...noCriteria, service: "Pôle eau" };

        const resultat = filter(portfolio, criteria, today);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 24034"]);
      });
    });
  });

  describe("Given l'état En cours", () => {
    describe("When on filtre", () => {
      test("Then le marché terminé disparaît de la liste", () => {
        const criteria = { ...noCriteria, state: "en_cours" } as const;

        const resultat = filter(portfolio, criteria, today);

        expect(resultat.map((m) => m.reference)).toEqual(["AO 25075", "AO 24034"]);
      });
    });
  });

  describe("Given l'état Terminés", () => {
    describe("When on filtre", () => {
      test("Then seul le marché terminé reste", () => {
        const criteria = { ...noCriteria, state: "termines" } as const;

        const resultat = filter(portfolio, criteria, today);

        expect(resultat.map((m) => m.reference)).toEqual(["MA 24036"]);
      });
    });
  });
});

describe("services du portefeuille", () => {
  describe("Given des marchés de plusieurs services, dont un sans service", () => {
    describe("When on liste les services", () => {
      test("Then chaque service apparaît une fois, trié, sans valeur vide", () => {
        const portfolio = [
          contract({ service: "Travaux" }),
          contract({ service: "Espaces verts" }),
          contract({ service: "Travaux" }),
          contract({ service: null }),
        ];

        const liste = departments(portfolio);

        expect(liste).toEqual(["Espaces verts", "Travaux"]);
      });
    });
  });
});

describe("présentation des montants et des périodes", () => {
  describe("Given un montant de 559 200 euros", () => {
    describe("When on le formate", () => {
      test("Then il porte l'euro après une espace insécable", () => {
        const text = formatAmount(55_920_000);

        expect(text).toBe("559 200,00 €");
      });
    });
  });

  describe("Given un portefeuille de 38,4 millions d'euros", () => {
    describe("When on le formate en abrégé", () => {
      test("Then il s'écrit en millions avec une décimale", () => {
        const text = formatCompactAmount(3_840_000_000);

        expect(text).toBe("38,4 M€");
      });
    });
  });

  describe("Given un montant sous le million", () => {
    describe("When on le formate en abrégé", () => {
      test("Then il garde son écriture complète", () => {
        const text = formatCompactAmount(31_845_000);

        expect(text).toBe("318 450,00 €");
      });
    });
  });

  describe("Given un marché du 1er décembre 2024 au 1er décembre 2027", () => {
    describe("When on formate sa période", () => {
      test("Then elle s'écrit en mois et année", () => {
        const text = formatPeriod("2024-12-01", "2027-12-01");

        expect(text).toBe("12/2024 au 12/2027");
      });
    });
  });

  describe("Given un marché sans aucune date", () => {
    describe("When on formate sa période", () => {
      test("Then elle est dite non renseignée", () => {
        const text = formatPeriod(null, null);

        expect(text).toBe("Non renseignée");
      });
    });
  });
});

describe("montant initial d'un marché dans le détail d'une alerte", () => {
  describe("Given un montant initial de 186 400 euros", () => {
    describe("When on l'affiche", () => {
      test("Then il est écrit en euros", () => {
        const text = formatEuros("186400.00");

        expect(text).toBe(formatAmount(18_640_000));
      });
    });
  });

  describe("Given un marché sans montant initial dans CIRIL", () => {
    describe("When on l'affiche", () => {
      test("Then on lit qu'il n'est pas renseigné", () => {
        const text = formatEuros(null);

        expect(text).toBe("Non renseigné");
      });
    });
  });
});
