import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, test } from "vitest";
import { clearNuxtData } from "#imports";

import Sidebar from "../Sidebar.vue";

describe("application sidebar", () => {
  beforeEach(() => {
    clearNuxtData("derniere-synchronisation");
    registerEndpoint("/api/synchronisation/derniere", () => ({ finishedOn: null }));
  });

  describe("Given a logged-in agent", () => {
    describe("When the sidebar is displayed", () => {
      test("Then the community is named", async () => {
        const sidebar = await mountSuspended(Sidebar);

        expect(sidebar.text()).toContain("CC Golfe de Saint-Tropez");
      });

      test("Then the menu offers the four monitoring screens, in order", async () => {
        const sidebar = await mountSuspended(Sidebar);

        const items = sidebar.findAll("nav a").map((link) => link.text());

        expect(items).toEqual(["Tableau de bord", "Alertes", "Marchés", "Échéancier"]);
      });

      test("Then the CIRIL data status is visible", async () => {
        const sidebar = await mountSuspended(Sidebar);

        expect(sidebar.text()).toContain("Aucune lecture de CIRIL");
      });

      test("Then a button allows logging out", async () => {
        const sidebar = await mountSuspended(Sidebar);

        const logout = sidebar.get("form[action='/auth/deconnexion']");

        expect(logout.text()).toBe("Se déconnecter");
      });
    });
  });
});
