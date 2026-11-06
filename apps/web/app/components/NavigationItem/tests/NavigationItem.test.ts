import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import NavigationItem from "../NavigationItem.vue";

describe("navigation menu item", () => {
  describe("Given the Accueil item and a visitor on the home page", () => {
    describe("When the menu is displayed", () => {
      test("Then the item is marked as the current page", async () => {
        const props = { label: "Accueil", route: "/" };

        const item = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(item.get("a").attributes("aria-current")).toBe("page");
      });
    });
  });

  describe("Given the Alertes item and a visitor on the home page", () => {
    describe("When the menu is displayed", () => {
      test("Then the item is not marked as the current page", async () => {
        const props = { label: "Alertes", route: "/alertes" };

        const item = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(item.get("a").attributes("aria-current")).toBeUndefined();
      });

      test("Then it leads to the alerts page", async () => {
        const props = { label: "Alertes", route: "/alertes" };

        const item = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(item.get("a").attributes("href")).toBe("/alertes");
      });
    });
  });
});
