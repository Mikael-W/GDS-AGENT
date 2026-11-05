import { describe, expect, test } from "vitest";

import { aujourdhuiParis, paginer, pluriel, TAILLE_PAGE } from "@/shared/domaine/affichage";

describe("accord au pluriel", () => {
  describe("Given un seul marché", () => {
    describe("When on formule le nombre", () => {
      test("Then le mot reste au singulier", () => {
        const libelle = pluriel(1, "marché");

        expect(libelle).toBe("1 marché");
      });
    });
  });

  describe("Given trois marchés", () => {
    describe("When on formule le nombre", () => {
      test("Then le mot prend un s", () => {
        const libelle = pluriel(3, "marché");

        expect(libelle).toBe("3 marchés");
      });
    });
  });
});

describe("pagination d'une liste", () => {
  const nombreDeLignes = TAILLE_PAGE * 2 + 3;
  const liste = Array.from({ length: nombreDeLignes }, (_, i) => `AO ${i}`);

  describe("Given vingt-trois lignes", () => {
    describe("When on demande la dernière page", () => {
      test("Then elle porte les trois dernières lignes", () => {
        const resultat = paginer(liste, 3);

        expect(resultat.lignes).toHaveLength(3);
      });

      test("Then le total reste celui de la liste entière", () => {
        const resultat = paginer(liste, 3);

        expect(resultat.total).toBe(nombreDeLignes);
      });
    });

    describe("When on demande une page au-delà de la dernière", () => {
      test("Then on retombe sur la dernière page", () => {
        const resultat = paginer(liste, 9);

        expect(resultat.page).toBe(3);
      });
    });
  });

  describe("Given une liste vide", () => {
    describe("When on demande la première page", () => {
      test("Then il reste une page, sans ligne", () => {
        const resultat = paginer([], 1);

        expect(resultat).toEqual({ lignes: [], total: 0, page: 1, pages: 1 });
      });
    });
  });
});

describe("date du jour à Paris", () => {
  describe("Given 23 h 30 à Greenwich le 4 novembre 2026, soit minuit passé à Paris", () => {
    describe("When on demande la date du jour", () => {
      test("Then c'est déjà le 5 novembre", () => {
        const maintenant = new Date("2026-11-04T23:30:00Z");

        const date = aujourdhuiParis(maintenant);

        expect(date).toBe("2026-11-05");
      });
    });
  });

  describe("Given 22 h 30 à Greenwich le 4 novembre 2026, soit 23 h 30 à Paris", () => {
    describe("When on demande la date du jour", () => {
      test("Then c'est encore le 4 novembre", () => {
        const maintenant = new Date("2026-11-04T22:30:00Z");

        const date = aujourdhuiParis(maintenant);

        expect(date).toBe("2026-11-04");
      });
    });
  });
});
