import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, test, vi } from "vitest";

import FormulaireNom from "../composant/FormulaireNom.vue";

describe("formulaire du nom affiché", () => {
  describe("Given un agent dont le nom affiché est Mika", () => {
    describe("When on ouvre le formulaire", () => {
      test("Then le champ propose son nom actuel", async () => {
        const formulaire = await mountSuspended(FormulaireNom, { props: { nomInitial: "Mika" } });

        expect(formulaire.get("input").element.value).toBe("Mika");
      });
    });
  });

  describe("Given un agent qui remplace son nom par Camille Roux", () => {
    describe("When il enregistre", () => {
      test("Then le nouveau nom est envoyé, le formulaire confirme et prévient la page", async () => {
        let recu: unknown;
        registerEndpoint("/api/compte/renommer", {
          method: "POST",
          handler: async (event) => {
            recu = await readBody(event);
            return { ok: true };
          },
        });
        const formulaire = await mountSuspended(FormulaireNom, { props: { nomInitial: "Mika" } });

        await formulaire.get("input").setValue("Camille Roux");
        await formulaire.get("form").trigger("submit");
        await vi.waitFor(() => expect(formulaire.text()).toContain("Enregistré."));

        expect(recu).toEqual({ nom: "Camille Roux" });
        expect(formulaire.emitted("enregistre")).toHaveLength(1);
      });
    });
  });

  describe("Given un agent qui envoie un nom vide", () => {
    describe("When le serveur refuse", () => {
      test("Then le motif du refus est affiché et rien n'est confirmé", async () => {
        registerEndpoint("/api/compte/renommer", {
          method: "POST",
          handler: () => {
            throw createError({ statusCode: 400, statusMessage: "Le nom est vide" });
          },
        });
        const formulaire = await mountSuspended(FormulaireNom, { props: { nomInitial: "Mika" } });

        await formulaire.get("input").setValue("");
        await formulaire.get("form").trigger("submit");
        await vi.waitFor(() => expect(formulaire.find("[role=alert]").exists()).toBe(true));

        expect(formulaire.get("[role=alert]").text()).toBe("Le nom est vide");
        expect(formulaire.text()).not.toContain("Enregistré.");
        expect(formulaire.emitted("enregistre")).toBeUndefined();
      });
    });
  });
});
