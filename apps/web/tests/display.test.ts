import { describe, expect, test } from "vitest";

import { PAGE_SIZE, paginate, parisDay, plural } from "@/shared/domain/display";

describe("plural agreement", () => {
  describe("Given a single contract", () => {
    describe("When the number is worded", () => {
      test("Then the word stays singular", () => {
        const label = plural(1, "marché");

        expect(label).toBe("1 marché");
      });
    });
  });

  describe("Given three contracts", () => {
    describe("When the number is worded", () => {
      test("Then the word takes an s", () => {
        const label = plural(3, "marché");

        expect(label).toBe("3 marchés");
      });
    });
  });
});

describe("list pagination", () => {
  const rowCount = PAGE_SIZE * 2 + 3;
  const list = Array.from({ length: rowCount }, (_, i) => `AO ${i}`);

  describe("Given twenty-three rows", () => {
    describe("When the last page is requested", () => {
      test("Then it carries the last three rows", () => {
        const result = paginate(list, 3);

        expect(result.rows).toHaveLength(3);
      });

      test("Then the total remains that of the whole list", () => {
        const result = paginate(list, 3);

        expect(result.total).toBe(rowCount);
      });
    });

    describe("When a page beyond the last is requested", () => {
      test("Then we fall back on the last page", () => {
        const result = paginate(list, 9);

        expect(result.page).toBe(3);
      });
    });
  });

  describe("Given an empty list", () => {
    describe("When the first page is requested", () => {
      test("Then one page remains, without rows", () => {
        const result = paginate([], 1);

        expect(result).toEqual({ rows: [], total: 0, page: 1, pages: 1 });
      });
    });
  });
});

describe("calendar day in Paris", () => {
  describe("Given 23:30 in Greenwich on 4 November 2026, which is past midnight in Paris", () => {
    describe("When the calendar day in Paris is requested", () => {
      test("Then it is already 5 November", () => {
        const instant = new Date("2026-11-04T23:30:00Z");

        const date = parisDay(instant);

        expect(date).toBe("2026-11-05");
      });
    });
  });

  describe("Given 22:30 in Greenwich on 4 November 2026, which is 23:30 in Paris", () => {
    describe("When the calendar day in Paris is requested", () => {
      test("Then it is still 4 November", () => {
        const instant = new Date("2026-11-04T22:30:00Z");

        const date = parisDay(instant);

        expect(date).toBe("2026-11-04");
      });
    });
  });
});
