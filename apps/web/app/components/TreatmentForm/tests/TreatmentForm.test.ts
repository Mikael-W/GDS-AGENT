import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, test, vi } from "vitest";

import TreatmentForm from "../TreatmentForm.vue";

const root = "/api/alertes/CON001/reconduction";
const props = { root };

describe("alert treatment form", () => {
  describe("Given an alert whose decision nobody has written yet", () => {
    describe("When the form is opened", () => {
      test("Then the Marquer comme traité button is disabled while the comment is empty", async () => {
        const form = await mountSuspended(TreatmentForm, { props });

        expect(form.get("button").attributes("disabled")).toBeDefined();
      });
    });
  });

  describe("Given an agent who writes Contrat reconduit, visa du service", () => {
    describe("When the agent marks the alert as handled", () => {
      test("Then the typed comment is sent as is and the page is notified", async () => {
        let received: unknown;
        registerEndpoint(`${root}/traitement`, {
          method: "POST",
          handler: async (event) => {
            received = await readBody(event);
            return { ok: true };
          },
        });
        const form = await mountSuspended(TreatmentForm, { props });

        await form.get("textarea").setValue("Contrat reconduit, visa du service");
        await form.get("form").trigger("submit");
        await vi.waitFor(() => expect(form.emitted("handled")).toHaveLength(1));

        expect(received).toEqual({ comment: "Contrat reconduit, visa du service" });
      });
    });
  });

  describe("Given an alert already handled by a colleague", () => {
    describe("When the server refuses the treatment", () => {
      test("Then the reason for the refusal is shown and the page is not notified", async () => {
        registerEndpoint(`${root}/traitement`, {
          method: "POST",
          handler: () => {
            throw createError({
              statusCode: 409,
              data: { message: "Cette alerte a déjà été traitée par un collègue." },
            });
          },
        });
        const form = await mountSuspended(TreatmentForm, { props });

        await form.get("textarea").setValue("Contrat reconduit");
        await form.get("form").trigger("submit");
        await vi.waitFor(() => expect(form.find("[role=alert]").exists()).toBe(true));

        expect(form.get("[role=alert]").text()).toBe(
          "Cette alerte a déjà été traitée par un collègue.",
        );
        expect(form.emitted("handled")).toBeUndefined();
      });
    });
  });

  describe("Given a server incident unrelated to the input", () => {
    describe("When the agent tries to mark the alert as handled", () => {
      test("Then a message about the product is read, not about the incident", async () => {
        registerEndpoint(`${root}/traitement`, {
          method: "POST",
          handler: () => {
            throw createError({ statusCode: 500, data: { message: "Internal Server Error" } });
          },
        });
        const form = await mountSuspended(TreatmentForm, { props });

        await form.get("textarea").setValue("Contrat reconduit");
        await form.get("form").trigger("submit");
        await vi.waitFor(() => expect(form.find("[role=alert]").exists()).toBe(true));

        expect(form.get("[role=alert]").text()).toBe(
          "Le traitement n'a pas pu être enregistré. Réessayez dans un instant.",
        );
      });
    });
  });
});
