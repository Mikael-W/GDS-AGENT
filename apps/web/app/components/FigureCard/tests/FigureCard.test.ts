import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import FigureCard from "../FigureCard.vue";

describe("key figure card", () => {
  describe("Given 38 ongoing contracts", () => {
    describe("When the card is displayed", () => {
      test("Then the label and the figure are read", async () => {
        const props = { label: "Marchés en cours", value: "38" };

        const card = await mountSuspended(FigureCard, { props });

        expect(card.text()).toContain("Marchés en cours");
        expect(card.text()).toContain("38");
      });
    });
  });
});
