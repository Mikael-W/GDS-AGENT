import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import CarteChiffre from "../composant/CarteChiffre.vue";

describe("carte de chiffre clé", () => {
  describe("Given 38 marchés en cours", () => {
    describe("When on affiche la carte", () => {
      test("Then on lit le libellé et le chiffre", async () => {
        const props = { libelle: "Marchés en cours", valeur: "38" };

        const carte = await mountSuspended(CarteChiffre, { props });

        expect(carte.text()).toContain("Marchés en cours");
        expect(carte.text()).toContain("38");
      });
    });
  });
});
