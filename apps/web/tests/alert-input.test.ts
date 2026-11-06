import { describe, expect, test } from "vitest";

import { AlertParameters, TreatmentBody } from "@/server/utils/alert-input";

describe("commentaire d'un traitement d'alerte", () => {
  describe("Given un commentaire écrit par un agent", () => {
    describe("When on le valide", () => {
      test("Then il est accepté, sans les espaces autour", () => {
        const saisie = { comment: "  Reconduction acceptée avec le titulaire.  " };

        const resultat = TreatmentBody.safeParse(saisie);

        expect(resultat.data).toEqual({ comment: "Reconduction acceptée avec le titulaire." });
      });
    });
  });

  describe("Given un commentaire vide", () => {
    describe("When on le valide", () => {
      test("Then il est refusé avec un message qui dit quoi faire", () => {
        const saisie = { comment: "" };

        const resultat = TreatmentBody.safeParse(saisie);

        expect(resultat.error?.issues[0]?.message).toBe("Indiquez ce qui a été décidé");
      });
    });
  });

  describe("Given un commentaire fait uniquement d'espaces", () => {
    describe("When on le valide", () => {
      test("Then il est refusé comme un commentaire vide", () => {
        const saisie = { comment: "     " };

        const resultat = TreatmentBody.safeParse(saisie);

        expect(resultat.success).toBe(false);
      });
    });
  });

  describe("Given un commentaire de 2 001 caractères", () => {
    describe("When on le valide", () => {
      test("Then il est refusé car trop long", () => {
        const saisie = { comment: "a".repeat(2001) };

        const resultat = TreatmentBody.safeParse(saisie);

        expect(resultat.success).toBe(false);
      });
    });
  });
});

describe("alerte désignée dans l'adresse", () => {
  describe("Given la référence AO 25075 et la famille reconduction", () => {
    describe("When on les valide", () => {
      test("Then l'alerte est reconnue", () => {
        const parameters = { reference: "AO 25075", family: "reconduction" };

        const resultat = AlertParameters.safeParse(parameters);

        expect(resultat.success).toBe(true);
      });
    });
  });

  describe("Given une famille qui n'existe pas", () => {
    describe("When on la valide", () => {
      test("Then l'alerte est refusée", () => {
        const parameters = { reference: "AO 25075", family: "inconnue" };

        const resultat = AlertParameters.safeParse(parameters);

        expect(resultat.success).toBe(false);
      });
    });
  });

  describe("Given une référence vide", () => {
    describe("When on la valide", () => {
      test("Then l'alerte est refusée", () => {
        const parameters = { reference: " ", family: "reconduction" };

        const resultat = AlertParameters.safeParse(parameters);

        expect(resultat.success).toBe(false);
      });
    });
  });
});
