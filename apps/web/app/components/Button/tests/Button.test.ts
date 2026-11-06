import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import Button from "../Button.vue";

describe("bouton de l'interface", () => {
  describe("Given un bouton sans réglage particulier", () => {
    describe("When on l'affiche avec le texte Enregistrer", () => {
      test("Then il porte ce texte et reste un bouton simple, sans envoi de formulaire", async () => {
        const button = await mountSuspended(Button, { slots: { default: "Enregistrer" } });

        expect(button.text()).toBe("Enregistrer");
        expect(button.attributes("type")).toBe("button");
      });

      test("Then il a l'apparence principale", async () => {
        const button = await mountSuspended(Button, { slots: { default: "Enregistrer" } });

        expect(button.classes()).toContain("button--primary");
      });
    });
  });

  describe("Given un bouton de contour et de petite taille destiné à envoyer un formulaire", () => {
    describe("When on l'affiche", () => {
      test("Then il en prend l'apparence et le type d'envoi", async () => {
        const button = await mountSuspended(Button, {
          props: { variant: "outline", size: "small", type: "submit" },
        });

        expect(button.classes()).toEqual(
          expect.arrayContaining(["button--outline", "button--small"]),
        );
        expect(button.attributes("type")).toBe("submit");
      });
    });
  });

  describe("Given un bouton désactivé", () => {
    describe("When on l'affiche", () => {
      test("Then il est inutilisable", async () => {
        const button = await mountSuspended(Button, { props: { disabled: true } });

        expect(button.attributes("disabled")).toBeDefined();
      });
    });
  });
});
