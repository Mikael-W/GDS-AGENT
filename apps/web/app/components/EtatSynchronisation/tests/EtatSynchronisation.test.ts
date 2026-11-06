import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";
import { beforeEach, describe, expect, test } from "vitest";
import { clearNuxtData } from "#imports";

import EtatSynchronisation from "../composant/EtatSynchronisation.vue";

const ADRESSE = "/api/synchronisation/derniere";
const JOUR_MS = 86_400_000;

describe("état de fraîcheur des données CIRIL", () => {
  beforeEach(() => clearNuxtData("derniere-synchronisation"));

  describe("Given une synchronisation terminée il y a une heure", () => {
    describe("When on affiche l'état", () => {
      test("Then les données sont annoncées à jour", async () => {
        const uneHeure = new Date(Date.now() - 3_600_000).toISOString();
        registerEndpoint(ADRESSE, () => ({ termineeLe: uneHeure }));

        const etat = await mountSuspended(EtatSynchronisation);

        expect(etat.text()).toContain("Données à jour");
        expect(etat.classes()).toContain("etat--conforme");
      });
    });
  });

  describe("Given une dernière synchronisation vieille de trois jours", () => {
    describe("When on affiche l'état", () => {
      test("Then les données sont signalées comme anciennes", async () => {
        const troisJours = new Date(Date.now() - 3 * JOUR_MS).toISOString();
        registerEndpoint(ADRESSE, () => ({ termineeLe: troisJours }));

        const etat = await mountSuspended(EtatSynchronisation);

        expect(etat.text()).toContain("Données anciennes");
        expect(etat.classes()).toContain("etat--retard");
      });
    });
  });

  describe("Given une application qui n'a encore jamais lu CIRIL", () => {
    describe("When on affiche l'état", () => {
      test("Then on lit qu'aucune lecture n'a eu lieu", async () => {
        registerEndpoint(ADRESSE, () => ({ termineeLe: null }));

        const etat = await mountSuspended(EtatSynchronisation);

        expect(etat.text()).toContain("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given un état de synchronisation impossible à lire", () => {
    describe("When on affiche l'état", () => {
      test("Then on lit que la fraîcheur est indisponible", async () => {
        registerEndpoint(ADRESSE, () => {
          throw createError({ statusCode: 500 });
        });

        const etat = await mountSuspended(EtatSynchronisation);

        expect(etat.text()).toContain("Fraîcheur indisponible");
      });
    });
  });
});
