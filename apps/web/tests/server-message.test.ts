import { describe, expect, test } from "vitest";

import { serverMessage } from "@/app/utils/server-message";

const parDefaut = "Enregistrement impossible";

describe("message d'erreur affiché à l'agent", () => {
  describe("Given un refus du serveur qui dit que le nom est vide", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le motif du serveur, sans code technique", () => {
        const refus = Object.assign(new Error("[POST] /api: 400 Bad Request"), {
          statusCode: 400,
          data: { data: { message: "Le nom est vide" } },
        });

        const message = serverMessage(refus, parDefaut);

        expect(message).toBe("Le nom est vide");
      });
    });
  });

  describe("Given une coupure réseau sans motif du serveur", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le message prévu par défaut", () => {
        const coupure = new TypeError("Failed to fetch");

        const message = serverMessage(coupure, parDefaut);

        expect(message).toBe(parDefaut);
      });
    });
  });

  describe("Given une erreur dont le motif est vide", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le message prévu par défaut", () => {
        const refus = { statusCode: 400, data: { data: { message: "" } } };

        const message = serverMessage(refus, parDefaut);

        expect(message).toBe(parDefaut);
      });
    });
  });

  describe("Given un incident du serveur dont le motif est un texte technique en anglais", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then on affiche le message prévu par défaut, pas le texte technique", () => {
        const incident = { statusCode: 500, data: { data: { message: "Internal Server Error" } } };

        const message = serverMessage(incident, parDefaut);

        expect(message).toBe(parDefaut);
      });
    });
  });
});

describe("accents dans le message d'erreur", () => {
  describe("Given un refus du serveur dont le motif contient des accents", () => {
    describe("When on prépare le message à afficher", () => {
      test("Then les accents sont conservés", () => {
        const refus = {
          statusCode: 409,
          data: { data: { message: "Cette alerte a déjà été traitée par un collègue." } },
        };

        const message = serverMessage(refus, parDefaut);

        expect(message).toBe("Cette alerte a déjà été traitée par un collègue.");
      });
    });
  });
});
