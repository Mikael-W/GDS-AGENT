import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import Bouton from "../composant/Bouton.vue";

describe("bouton de l'interface", () => {
  describe("Given un bouton sans réglage particulier", () => {
    describe("When on l'affiche avec le texte Enregistrer", () => {
      test("Then il porte ce texte et reste un bouton simple, sans envoi de formulaire", async () => {
        const bouton = await mountSuspended(Bouton, { slots: { default: "Enregistrer" } });

        expect(bouton.text()).toBe("Enregistrer");
        expect(bouton.attributes("type")).toBe("button");
      });

      test("Then il a l'apparence principale", async () => {
        const bouton = await mountSuspended(Bouton, { slots: { default: "Enregistrer" } });

        expect(bouton.classes()).toContain("bouton--primaire");
      });
    });
  });

  describe("Given un bouton de contour et de petite taille destiné à envoyer un formulaire", () => {
    describe("When on l'affiche", () => {
      test("Then il en prend l'apparence et le type d'envoi", async () => {
        const bouton = await mountSuspended(Bouton, {
          props: { variante: "contour", taille: "petit", type: "submit" },
        });

        expect(bouton.classes()).toEqual(
          expect.arrayContaining(["bouton--contour", "bouton--petit"]),
        );
        expect(bouton.attributes("type")).toBe("submit");
      });
    });
  });

  describe("Given un bouton désactivé", () => {
    describe("When on l'affiche", () => {
      test("Then il est inutilisable", async () => {
        const bouton = await mountSuspended(Bouton, { props: { disabled: true } });

        expect(bouton.attributes("disabled")).toBeDefined();
      });
    });
  });
});
