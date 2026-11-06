import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, test } from "vitest";
import { clearNuxtData } from "#imports";

import Sidebar from "../Sidebar.vue";

describe("barre latérale de l'application", () => {
  beforeEach(() => {
    clearNuxtData("derniere-synchronisation");
    registerEndpoint("/api/synchronisation/derniere", () => ({ finishedOn: null }));
  });

  describe("Given un agent connecté", () => {
    describe("When on affiche la barre latérale", () => {
      test("Then la collectivité est nommée", async () => {
        const barre = await mountSuspended(Sidebar);

        expect(barre.text()).toContain("CC Golfe de Saint-Tropez");
      });

      test("Then le menu propose les quatre écrans de suivi, dans l'ordre", async () => {
        const barre = await mountSuspended(Sidebar);

        const entrees = barre.findAll("nav a").map((lien) => lien.text());

        expect(entrees).toEqual(["Tableau de bord", "Alertes", "Marchés", "Échéancier"]);
      });

      test("Then l'état des données CIRIL est visible", async () => {
        const barre = await mountSuspended(Sidebar);

        expect(barre.text()).toContain("Aucune lecture de CIRIL");
      });

      test("Then un bouton permet de se déconnecter", async () => {
        const barre = await mountSuspended(Sidebar);

        const deconnexion = barre.get("form[action='/auth/deconnexion']");

        expect(deconnexion.text()).toBe("Se déconnecter");
      });
    });
  });
});
