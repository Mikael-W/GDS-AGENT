import { describe, expect, test } from "vitest";

import { FRESHNESS_THRESHOLD_MS, freshness } from "@/app/domain/freshness";

describe("freshness", () => {
  const now = new Date("2026-11-05T10:00:00Z");

  describe("Given no CIRIL reading", () => {
    describe("When freshness is evaluated", () => {
      test("Then the status requires attention", () => {
        const result = freshness(null, now);

        expect(result.state).toBe("attention");
      });

      test("Then the title says CIRIL has not been read yet", () => {
        const result = freshness(null, now);

        expect(result.title).toBe("Aucune lecture de CIRIL");
      });
    });
  });

  describe("Given a recent reading", () => {
    const reading = new Date("2026-11-05T05:00:00Z");

    describe("When freshness is evaluated", () => {
      test("Then the status is compliant", () => {
        const result = freshness(reading, now);

        expect(result.state).toBe("conforme");
      });

      test("Then the title announces up-to-date data", () => {
        const result = freshness(reading, now);

        expect(result.title).toBe("Données à jour");
      });

      test("Then the detail gives the Paris date and time", () => {
        const result = freshness(reading, now);

        expect(result.details).toBe("Lues dans CIRIL le 05/11/2026 à 06:00");
      });
    });
  });

  describe("Given a reading exactly at the threshold", () => {
    const reading = new Date(now.getTime() - FRESHNESS_THRESHOLD_MS);

    describe("When freshness is evaluated", () => {
      test("Then the data is still up to date", () => {
        const result = freshness(reading, now);

        expect(result.state).toBe("conforme");
      });
    });
  });

  describe("Given a reading older than the threshold", () => {
    const reading = new Date(now.getTime() - FRESHNESS_THRESHOLD_MS - 1);

    describe("When freshness is evaluated", () => {
      test("Then the status is late", () => {
        const result = freshness(reading, now);

        expect(result.state).toBe("retard");
      });

      test("Then the title announces old data", () => {
        const result = freshness(reading, now);

        expect(result.title).toBe("Données anciennes");
      });

      test("Then the detail announces the last reading", () => {
        const result = freshness(reading, now);

        expect(result.details).toBe("Dernière lecture le 04/11/2026 à 08:59");
      });
    });
  });
});
