import { describe, expect, test } from "vitest";

import { AlertParameters, TreatmentBody } from "@/server/utils/alert-input";

describe("comment on an alert treatment", () => {
  describe("Given a comment written by an agent", () => {
    describe("When it is validated", () => {
      test("Then it is accepted, without the surrounding spaces", () => {
        const input = { comment: "  Reconduction acceptée avec le titulaire.  " };

        const result = TreatmentBody.safeParse(input);

        expect(result.data).toEqual({ comment: "Reconduction acceptée avec le titulaire." });
      });
    });
  });

  describe("Given an empty comment", () => {
    describe("When it is validated", () => {
      test("Then it is rejected with a message that says what to do", () => {
        const input = { comment: "" };

        const result = TreatmentBody.safeParse(input);

        expect(result.error?.issues[0]?.message).toBe("Indiquez ce qui a été décidé");
      });
    });
  });

  describe("Given a comment made only of spaces", () => {
    describe("When it is validated", () => {
      test("Then it is rejected like an empty comment", () => {
        const input = { comment: "     " };

        const result = TreatmentBody.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("Given a comment of 2,001 characters", () => {
    describe("When it is validated", () => {
      test("Then it is rejected as too long", () => {
        const input = { comment: "a".repeat(2001) };

        const result = TreatmentBody.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });
});

describe("alert designated in the address", () => {
  describe("Given reference AO 25075 and the reconduction family", () => {
    describe("When they are validated", () => {
      test("Then the alert is recognised", () => {
        const parameters = { reference: "AO 25075", family: "reconduction" };

        const result = AlertParameters.safeParse(parameters);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("Given a family that does not exist", () => {
    describe("When it is validated", () => {
      test("Then the alert is rejected", () => {
        const parameters = { reference: "AO 25075", family: "inconnue" };

        const result = AlertParameters.safeParse(parameters);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("Given an empty reference", () => {
    describe("When it is validated", () => {
      test("Then the alert is rejected", () => {
        const parameters = { reference: " ", family: "reconduction" };

        const result = AlertParameters.safeParse(parameters);

        expect(result.success).toBe(false);
      });
    });
  });
});
