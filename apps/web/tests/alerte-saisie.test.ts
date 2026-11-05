import { describe, expect, test } from "vitest";

import { CorpsTraitement, ParametresAlerte } from "@/server/utils/alerte-saisie";

describe("commentaire d'un traitement d'alerte", () => {
  describe("Given un commentaire écrit par un agent", () => {
    describe("When on le valide", () => {
      test("Then il est accepté, sans les espaces autour", () => {
        const saisie = { commentaire: "  Reconduction acceptée avec le titulaire.  " };

        const resultat = CorpsTraitement.safeParse(saisie);

        expect(resultat.data).toEqual({ commentaire: "Reconduction acceptée avec le titulaire." });
      });
    });
  });

  describe("Given un commentaire vide", () => {
    describe("When on le valide", () => {
      test("Then il est refusé avec un message qui dit quoi faire", () => {
        const saisie = { commentaire: "" };

        const resultat = CorpsTraitement.safeParse(saisie);

        expect(resultat.error?.issues[0]?.message).toBe("Indiquez ce qui a été décidé");
      });
    });
  });

  describe("Given un commentaire fait uniquement d'espaces", () => {
    describe("When on le valide", () => {
      test("Then il est refusé comme un commentaire vide", () => {
        const saisie = { commentaire: "     " };

        const resultat = CorpsTraitement.safeParse(saisie);

        expect(resultat.success).toBe(false);
      });
    });
  });

  describe("Given un commentaire de 2 001 caractères", () => {
    describe("When on le valide", () => {
      test("Then il est refusé car trop long", () => {
        const saisie = { commentaire: "a".repeat(2001) };

        const resultat = CorpsTraitement.safeParse(saisie);

        expect(resultat.success).toBe(false);
      });
    });
  });
});

describe("alerte désignée dans l'adresse", () => {
  describe("Given la référence AO 25075 et la famille reconduction", () => {
    describe("When on les valide", () => {
      test("Then l'alerte est reconnue", () => {
        const parametres = { reference: "AO 25075", famille: "reconduction" };

        const resultat = ParametresAlerte.safeParse(parametres);

        expect(resultat.success).toBe(true);
      });
    });
  });

  describe("Given une famille qui n'existe pas", () => {
    describe("When on la valide", () => {
      test("Then l'alerte est refusée", () => {
        const parametres = { reference: "AO 25075", famille: "inconnue" };

        const resultat = ParametresAlerte.safeParse(parametres);

        expect(resultat.success).toBe(false);
      });
    });
  });

  describe("Given une référence vide", () => {
    describe("When on la valide", () => {
      test("Then l'alerte est refusée", () => {
        const parametres = { reference: " ", famille: "reconduction" };

        const resultat = ParametresAlerte.safeParse(parametres);

        expect(resultat.success).toBe(false);
      });
    });
  });
});
