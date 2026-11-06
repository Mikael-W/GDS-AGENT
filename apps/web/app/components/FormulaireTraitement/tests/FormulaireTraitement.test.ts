import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, test, vi } from "vitest";

import FormulaireTraitement from "../composant/FormulaireTraitement.vue";

const racine = "/api/alertes/CON001/reconduction";
const props = { racine };

describe("formulaire de traitement d'une alerte", () => {
  describe("Given une alerte dont personne n'a encore écrit la décision", () => {
    describe("When on ouvre le formulaire", () => {
      test("Then le bouton Marquer comme traité est désactivé tant que le commentaire est vide", async () => {
        const formulaire = await mountSuspended(FormulaireTraitement, { props });

        expect(formulaire.get("button").attributes("disabled")).toBeDefined();
      });
    });
  });

  describe("Given un agent qui écrit Contrat reconduit, visa du service", () => {
    describe("When il marque l'alerte comme traitée", () => {
      test("Then le commentaire saisi est envoyé tel quel et la page est prévenue", async () => {
        let recu: unknown;
        registerEndpoint(`${racine}/traitement`, {
          method: "POST",
          handler: async (event) => {
            recu = await readBody(event);
            return { ok: true };
          },
        });
        const formulaire = await mountSuspended(FormulaireTraitement, { props });

        await formulaire.get("textarea").setValue("Contrat reconduit, visa du service");
        await formulaire.get("form").trigger("submit");
        await vi.waitFor(() => expect(formulaire.emitted("traite")).toHaveLength(1));

        expect(recu).toEqual({ commentaire: "Contrat reconduit, visa du service" });
      });
    });
  });

  describe("Given une alerte déjà traitée par un collègue", () => {
    describe("When le serveur refuse le traitement", () => {
      test("Then le motif du refus est affiché et la page n'est pas prévenue", async () => {
        registerEndpoint(`${racine}/traitement`, {
          method: "POST",
          handler: () => {
            throw createError({
              statusCode: 409,
              data: { message: "Cette alerte a déjà été traitée par un collègue." },
            });
          },
        });
        const formulaire = await mountSuspended(FormulaireTraitement, { props });

        await formulaire.get("textarea").setValue("Contrat reconduit");
        await formulaire.get("form").trigger("submit");
        await vi.waitFor(() => expect(formulaire.find("[role=alert]").exists()).toBe(true));

        expect(formulaire.get("[role=alert]").text()).toBe(
          "Cette alerte a déjà été traitée par un collègue.",
        );
        expect(formulaire.emitted("traite")).toBeUndefined();
      });
    });
  });

  describe("Given un incident du serveur sans rapport avec la saisie", () => {
    describe("When l'agent tente de marquer l'alerte comme traitée", () => {
      test("Then il lit un message qui parle du produit, pas de l'incident", async () => {
        registerEndpoint(`${racine}/traitement`, {
          method: "POST",
          handler: () => {
            throw createError({ statusCode: 500, data: { message: "Internal Server Error" } });
          },
        });
        const formulaire = await mountSuspended(FormulaireTraitement, { props });

        await formulaire.get("textarea").setValue("Contrat reconduit");
        await formulaire.get("form").trigger("submit");
        await vi.waitFor(() => expect(formulaire.find("[role=alert]").exists()).toBe(true));

        expect(formulaire.get("[role=alert]").text()).toBe(
          "Le traitement n'a pas pu être enregistré. Réessayez dans un instant.",
        );
      });
    });
  });
});
