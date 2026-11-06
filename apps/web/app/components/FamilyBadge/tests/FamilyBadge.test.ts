import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import FamilyBadge from "../FamilyBadge.vue";

describe("étiquette de famille d'alerte", () => {
  describe("Given une alerte de réception manquante dont l'échéance est dépassée", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then on lit le nom de la famille, signalé en retard", async () => {
        const props = { family: "reception", urgency: "retard" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.text()).toBe("Réception manquante");
      });

      test("Then elle est signalée en retard", async () => {
        const props = { family: "reception", urgency: "retard" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.classes()).toContain("etiquette--retard");
      });
    });
  });

  describe("Given une alerte de retenue de garantie dans trois semaines", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then on lit le nom de la famille", async () => {
        const props = { family: "garantie", urgency: "attention" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.text()).toBe("Retenue de garantie");
      });

      test("Then elle demande de l'attention", async () => {
        const props = { family: "garantie", urgency: "attention" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.classes()).toContain("etiquette--attention");
      });
    });
  });

  describe("Given une reconduction dans deux mois", () => {
    describe("When on affiche l'étiquette", () => {
      test("Then on lit le nom de la famille", async () => {
        const props = { family: "reconduction", urgency: "information" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.text()).toBe("Reconduction");
      });

      test("Then elle reste à titre d'information", async () => {
        const props = { family: "reconduction", urgency: "information" } as const;

        const etiquette = await mountSuspended(FamilyBadge, { props });

        expect(etiquette.classes()).toContain("etiquette--information");
      });
    });
  });
});
