import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import EtiquetteFamille from "../composant/EtiquetteFamille.vue";

describe("étiquette de famille d'alerte", () => {
  describe("Given une alerte de réception manquante dont l'échéance est dépassée", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then on lit le nom de la famille, signalé en retard", async () => {
        const props = { famille: "reception", urgence: "retard" } as const;

        const etiquette = await mountSuspended(EtiquetteFamille, { props });

        expect(etiquette.text()).toBe("Réception manquante");
        expect(etiquette.classes()).toContain("etiquette--retard");
      });
    });
  });

  describe("Given une alerte de retenue de garantie dans trois semaines", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then elle demande de l'attention", async () => {
        const props = { famille: "garantie", urgence: "attention" } as const;

        const etiquette = await mountSuspended(EtiquetteFamille, { props });

        expect(etiquette.text()).toBe("Retenue de garantie");
        expect(etiquette.classes()).toContain("etiquette--attention");
      });
    });
  });

  describe("Given une reconduction dans deux mois", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then elle reste à titre d'information", async () => {
        const props = { famille: "reconduction", urgence: "information" } as const;

        const etiquette = await mountSuspended(EtiquetteFamille, { props });

        expect(etiquette.classes()).toContain("etiquette--information");
      });
    });
  });
});
