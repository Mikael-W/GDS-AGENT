import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearNuxtData } from "#imports";

import SynchronizationStatus from "../SynchronizationStatus.vue";

const ENDPOINT = "/api/synchronisation/derniere";
const DAY_MS = 86_400_000;
const NOW = new Date("2026-11-05T09:00:00Z");

describe("état de fraîcheur des données CIRIL", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    clearNuxtData("derniere-synchronisation");
  });
  afterEach(() => vi.useRealTimers());

  describe("Given une synchronisation terminée il y a une heure", () => {
    describe("When on affiche l'état", () => {
      test("Then les données sont annoncées à jour", async () => {
        const uneHeure = new Date(NOW.getTime() - 3_600_000).toISOString();
        registerEndpoint(ENDPOINT, () => ({ finishedOn: uneHeure }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Données à jour");
        expect(state.classes()).toContain("etat--conforme");
      });
    });
  });

  describe("Given une dernière synchronisation vieille de trois jours", () => {
    describe("When on affiche l'état", () => {
      test("Then les données sont signalées comme anciennes", async () => {
        const troisJours = new Date(NOW.getTime() - 3 * DAY_MS).toISOString();
        registerEndpoint(ENDPOINT, () => ({ finishedOn: troisJours }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Données anciennes");
        expect(state.classes()).toContain("etat--retard");
      });
    });
  });

  describe("Given une application qui n'a encore jamais lu CIRIL", () => {
    describe("When on affiche l'état", () => {
      test("Then on lit qu'aucune lecture n'a eu lieu", async () => {
        registerEndpoint(ENDPOINT, () => ({ finishedOn: null }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given un état de synchronisation impossible à lire", () => {
    describe("When on affiche l'état", () => {
      test("Then on lit que la fraîcheur est indisponible", async () => {
        registerEndpoint(ENDPOINT, () => {
          throw createError({ statusCode: 500 });
        });

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Fraîcheur indisponible");
      });
    });
  });
});
