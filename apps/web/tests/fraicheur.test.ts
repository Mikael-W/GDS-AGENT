import { describe, expect, test } from "vitest";

import { fraicheur, SEUIL_FRAICHEUR_MS } from "@/app/domaine/fraicheur";

describe("fraicheur", () => {
  const maintenant = new Date("2026-11-05T10:00:00Z");

  describe("Given aucune lecture de CIRIL", () => {
    describe("When on évalue la fraîcheur", () => {
      test("Then l'état demande de l'attention", () => {
        const resultat = fraicheur(null, maintenant);

        expect(resultat.etat).toBe("attention");
      });

      test("Then le titre dit que CIRIL n'a pas encore été lu", () => {
        const resultat = fraicheur(null, maintenant);

        expect(resultat.titre).toBe("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given une lecture récente", () => {
    const lecture = new Date("2026-11-05T05:00:00Z");

    describe("When on évalue la fraîcheur", () => {
      test("Then l'état est conforme", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.etat).toBe("conforme");
      });

      test("Then le titre annonce des données à jour", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.titre).toBe("Données à jour");
      });

      test("Then le détail donne la date et l'heure de Paris", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.detail).toBe("Lues dans CIRIL le 05/11/2026 à 06:00");
      });
    });
  });

  describe("Given une lecture exactement au seuil", () => {
    const lecture = new Date(maintenant.getTime() - SEUIL_FRAICHEUR_MS);

    describe("When on évalue la fraîcheur", () => {
      test("Then les données sont encore à jour", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.etat).toBe("conforme");
      });
    });
  });

  describe("Given une lecture plus ancienne que le seuil", () => {
    const lecture = new Date(maintenant.getTime() - SEUIL_FRAICHEUR_MS - 1);

    describe("When on évalue la fraîcheur", () => {
      test("Then l'état est en retard", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.etat).toBe("retard");
      });

      test("Then le titre annonce des données anciennes", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.titre).toBe("Données anciennes");
      });

      test("Then le détail annonce la dernière lecture", () => {
        const resultat = fraicheur(lecture, maintenant);

        expect(resultat.detail).toBe("Dernière lecture le 04/11/2026 à 08:59");
      });
    });
  });
});
