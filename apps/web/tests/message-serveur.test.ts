import { describe, expect, test } from "vitest";

import { messageServeur } from "@/app/utils/message-serveur";

const parDefaut = "Enregistrement impossible";

describe("message d'erreur affiché à l'agent", () => {
  describe("Given un refus du serveur qui dit que le nom est vide", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le motif du serveur, sans code technique", () => {
        const refus = Object.assign(new Error("[POST] /api: 400 Le nom est vide"), {
          statusMessage: "Le nom est vide",
        });

        const message = messageServeur(refus, parDefaut);

        expect(message).toBe("Le nom est vide");
      });
    });
  });

  describe("Given une coupure réseau sans motif du serveur", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le message prévu par défaut", () => {
        const coupure = new TypeError("Failed to fetch");

        const message = messageServeur(coupure, parDefaut);

        expect(message).toBe(parDefaut);
      });
    });
  });

  describe("Given une erreur dont le motif est vide", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le message prévu par défaut", () => {
        const refus = { statusMessage: "" };

        const message = messageServeur(refus, parDefaut);

        expect(message).toBe(parDefaut);
      });
    });
  });
});
