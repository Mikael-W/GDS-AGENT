import { describe, expect, test } from "vitest";

import { PAGE_SIZE, paginate, parisDay, plural } from "@/shared/domain/display";

describe("accord au pluriel", () => {
  describe("Given un seul marché", () => {
    describe("When on formule le nombre", () => {
      test("Then le mot reste au singulier", () => {
        const label = plural(1, "marché");

        expect(label).toBe("1 marché");
      });
    });
  });

  describe("Given trois marchés", () => {
    describe("When on formule le nombre", () => {
      test("Then le mot prend un s", () => {
        const label = plural(3, "marché");

        expect(label).toBe("3 marchés");
      });
    });
  });
});

describe("pagination d'une liste", () => {
  const nombreDeLignes = PAGE_SIZE * 2 + 3;
  const liste = Array.from({ length: nombreDeLignes }, (_, i) => `AO ${i}`);

  describe("Given vingt-trois lignes", () => {
    describe("When on demande la dernière page", () => {
      test("Then elle porte les trois dernières lignes", () => {
        const resultat = paginate(liste, 3);

        expect(resultat.rows).toHaveLength(3);
      });

      test("Then le total reste celui de la liste entière", () => {
        const resultat = paginate(liste, 3);

        expect(resultat.total).toBe(nombreDeLignes);
      });
    });

    describe("When on demande une page au-delà de la dernière", () => {
      test("Then on retombe sur la dernière page", () => {
        const resultat = paginate(liste, 9);

        expect(resultat.page).toBe(3);
      });
    });
  });

  describe("Given une liste vide", () => {
    describe("When on demande la première page", () => {
      test("Then il reste une page, sans ligne", () => {
        const resultat = paginate([], 1);

        expect(resultat).toEqual({ rows: [], total: 0, page: 1, pages: 1 });
      });
    });
  });
});

describe("jour civil à Paris", () => {
  describe("Given 23 h 30 à Greenwich le 4 novembre 2026, soit minuit passé à Paris", () => {
    describe("When on demande le jour civil à Paris", () => {
      test("Then c'est déjà le 5 novembre", () => {
        const instant = new Date("2026-11-04T23:30:00Z");

        const date = parisDay(instant);

        expect(date).toBe("2026-11-05");
      });
    });
  });

  describe("Given 22 h 30 à Greenwich le 4 novembre 2026, soit 23 h 30 à Paris", () => {
    describe("When on demande le jour civil à Paris", () => {
      test("Then c'est encore le 4 novembre", () => {
        const instant = new Date("2026-11-04T22:30:00Z");

        const date = parisDay(instant);

        expect(date).toBe("2026-11-04");
      });
    });
  });
});
