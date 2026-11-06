import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import NavigationItem from "../NavigationItem.vue";

describe("entrée du menu de navigation", () => {
  describe("Given l'entrée Accueil et un visiteur qui se trouve sur la page d'accueil", () => {
    describe("When on affiche le menu", () => {
      test("Then l'entrée est signalée comme la page courante", async () => {
        const props = { label: "Accueil", route: "/" };

        const entree = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(entree.get("a").attributes("aria-current")).toBe("page");
      });
    });
  });

  describe("Given l'entrée Alertes et un visiteur qui se trouve sur la page d'accueil", () => {
    describe("When on affiche le menu", () => {
      test("Then l'entrée n'est pas signalée comme la page courante", async () => {
        const props = { label: "Alertes", route: "/alertes" };

        const entree = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(entree.get("a").attributes("aria-current")).toBeUndefined();
      });

      test("Then elle mène à la page des alertes", async () => {
        const props = { label: "Alertes", route: "/alertes" };

        const entree = await mountSuspended(NavigationItem, { props, route: "/" });

        expect(entree.get("a").attributes("href")).toBe("/alertes");
      });
    });
  });
});
