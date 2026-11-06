import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import FigureCard from "../FigureCard.vue";

describe("carte de chiffre clé", () => {
  describe("Given 38 marchés en cours", () => {
    describe("When on affiche la carte", () => {
      test("Then on lit le libellé et le chiffre", async () => {
        const props = { label: "Marchés en cours", value: "38" };

        const carte = await mountSuspended(FigureCard, { props });

        expect(carte.text()).toContain("Marchés en cours");
        expect(carte.text()).toContain("38");
      });
    });
  });
});
