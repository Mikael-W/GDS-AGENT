import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearNuxtData } from "#imports";

import SynchronizationStatus from "../SynchronizationStatus.vue";

const ENDPOINT = "/api/synchronisation/derniere";
const DAY_MS = 86_400_000;
const NOW = new Date("2026-11-05T09:00:00Z");

describe("CIRIL data freshness status", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    clearNuxtData("last-synchronization");
  });
  afterEach(() => vi.useRealTimers());

  describe("Given a synchronization finished one hour ago", () => {
    describe("When the status is displayed", () => {
      test("Then the data is announced as up to date", async () => {
        const oneHour = new Date(NOW.getTime() - 3_600_000).toISOString();
        registerEndpoint(ENDPOINT, () => ({ finishedAt: oneHour }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Données à jour");
        expect(state.classes()).toContain("etat--conforme");
      });
    });
  });

  describe("Given a last synchronization three days old", () => {
    describe("When the status is displayed", () => {
      test("Then the data is flagged as old", async () => {
        const threeDays = new Date(NOW.getTime() - 3 * DAY_MS).toISOString();
        registerEndpoint(ENDPOINT, () => ({ finishedAt: threeDays }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Données anciennes");
        expect(state.classes()).toContain("etat--retard");
      });
    });
  });

  describe("Given an application that has never read CIRIL", () => {
    describe("When the status is displayed", () => {
      test("Then it states that no reading has taken place", async () => {
        registerEndpoint(ENDPOINT, () => ({ finishedAt: null }));

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given a synchronization status that cannot be read", () => {
    describe("When the status is displayed", () => {
      test("Then it states that freshness is unavailable", async () => {
        registerEndpoint(ENDPOINT, () => {
          throw createError({ statusCode: 500 });
        });

        const state = await mountSuspended(SynchronizationStatus);

        expect(state.text()).toContain("Fraîcheur indisponible");
      });
    });
  });
});
