import { describe, expect, test } from "vitest";

import { serverMessage } from "@/app/utils/server-message";

const fallback = "Enregistrement impossible";

describe("error message shown to the agent", () => {
  describe("Given a server refusal saying the name is empty", () => {
    describe("When the message to display is prepared", () => {
      test("Then the server reason is displayed, without technical code", () => {
        const refusal = Object.assign(new Error("[POST] /api: 400 Bad Request"), {
          statusCode: 400,
          data: { data: { message: "Le nom est vide" } },
        });

        const message = serverMessage(refusal, fallback);

        expect(message).toBe("Le nom est vide");
      });
    });
  });

  describe("Given a network outage without server reason", () => {
    describe("When the message to display is prepared", () => {
      test("Then the default message is displayed", () => {
        const outage = new TypeError("Failed to fetch");

        const message = serverMessage(outage, fallback);

        expect(message).toBe(fallback);
      });
    });
  });

  describe("Given an error whose reason is empty", () => {
    describe("When the message to display is prepared", () => {
      test("Then the default message is displayed", () => {
        const refusal = { statusCode: 400, data: { data: { message: "" } } };

        const message = serverMessage(refusal, fallback);

        expect(message).toBe(fallback);
      });
    });
  });

  describe("Given a server incident whose reason is a technical text in English", () => {
    describe("When the message to display is prepared", () => {
      test("Then the default message is displayed, not the technical text", () => {
        const incident = { statusCode: 500, data: { data: { message: "Internal Server Error" } } };

        const message = serverMessage(incident, fallback);

        expect(message).toBe(fallback);
      });
    });
  });
});

describe("accents in the error message", () => {
  describe("Given a server refusal whose reason contains accents", () => {
    describe("When the message to display is prepared", () => {
      test("Then the accents are kept", () => {
        const refusal = {
          statusCode: 409,
          data: { data: { message: "Cette alerte a déjà été traitée par un collègue." } },
        };

        const message = serverMessage(refusal, fallback);

        expect(message).toBe("Cette alerte a déjà été traitée par un collègue.");
      });
    });
  });
});
