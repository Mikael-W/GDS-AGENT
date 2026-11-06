import { describe, expect, test } from "vitest";

import { FRESHNESS_THRESHOLD_MS, freshness } from "@/app/domain/freshness";

describe("fraicheur", () => {
  const now = new Date("2026-11-05T10:00:00Z");

  describe("Given aucune lecture de CIRIL", () => {
    describe("When on évalue la fraîcheur", () => {
      test("Then l'état demande de l'attention", () => {
        const resultat = freshness(null, now);

        expect(resultat.state).toBe("attention");
      });

      test("Then le titre dit que CIRIL n'a pas encore été lu", () => {
        const resultat = freshness(null, now);

        expect(resultat.title).toBe("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given une lecture récente", () => {
    const lecture = new Date("2026-11-05T05:00:00Z");

    describe("When on évalue la fraîcheur", () => {
      test("Then l'état est conforme", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.state).toBe("conforme");
      });

      test("Then le titre annonce des données à jour", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.title).toBe("Données à jour");
      });

      test("Then le détail donne la date et l'heure de Paris", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.details).toBe("Lues dans CIRIL le 05/11/2026 à 06:00");
      });
    });
  });

  describe("Given une lecture exactement au seuil", () => {
    const lecture = new Date(now.getTime() - FRESHNESS_THRESHOLD_MS);

    describe("When on évalue la fraîcheur", () => {
      test("Then les données sont encore à jour", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.state).toBe("conforme");
      });
    });
  });

  describe("Given une lecture plus ancienne que le seuil", () => {
    const lecture = new Date(now.getTime() - FRESHNESS_THRESHOLD_MS - 1);

    describe("When on évalue la fraîcheur", () => {
      test("Then l'état est en retard", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.state).toBe("retard");
      });

      test("Then le titre annonce des données anciennes", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.title).toBe("Données anciennes");
      });

      test("Then le détail annonce la dernière lecture", () => {
        const resultat = freshness(lecture, now);

        expect(resultat.details).toBe("Dernière lecture le 04/11/2026 à 08:59");
      });
    });
  });
});
