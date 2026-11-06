import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import FamilyBadge from "../FamilyBadge.vue";

describe("alert family badge", () => {
  describe("Given a missing reception alert whose deadline has passed", () => {
    describe("When the badge is displayed", () => {
      test("Then the family name is read", async () => {
        const props = { family: "reception", urgency: "retard" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.text()).toBe("Réception manquante");
      });

      test("Then it is flagged as late", async () => {
        const props = { family: "reception", urgency: "retard" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.classes()).toContain("etiquette--retard");
      });
    });
  });

  describe("Given a retention guarantee alert in three weeks", () => {
    describe("When the badge is displayed", () => {
      test("Then the family name is read", async () => {
        const props = { family: "garantie", urgency: "attention" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.text()).toBe("Retenue de garantie");
      });

      test("Then it asks for attention", async () => {
        const props = { family: "garantie", urgency: "attention" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.classes()).toContain("etiquette--attention");
      });
    });
  });

  describe("Given a renewal in two months", () => {
    describe("When the badge is displayed", () => {
      test("Then the family name is read", async () => {
        const props = { family: "reconduction", urgency: "information" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.text()).toBe("Reconduction");
      });

      test("Then it stays informational", async () => {
        const props = { family: "reconduction", urgency: "information" } as const;

        const badge = await mountSuspended(FamilyBadge, { props });

        expect(badge.classes()).toContain("etiquette--information");
      });
    });
  });
});
