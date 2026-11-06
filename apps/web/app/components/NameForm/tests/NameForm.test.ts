import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, test, vi } from "vitest";

import NameForm from "../NameForm.vue";

describe("display name form", () => {
  describe("Given an agent whose display name is Mika", () => {
    describe("When the form is opened", () => {
      test("Then the field offers the current name", async () => {
        const form = await mountSuspended(NameForm, { props: { initialName: "Mika" } });

        expect(form.get("input").element.value).toBe("Mika");
      });
    });
  });

  describe("Given an agent who replaces the name with Camille Roux", () => {
    describe("When the agent saves", () => {
      test("Then the new name is sent, the form confirms and notifies the page", async () => {
        let received: unknown;
        registerEndpoint("/api/compte/renommer", {
          method: "POST",
          handler: async (event) => {
            received = await readBody(event);
            return { ok: true };
          },
        });
        const form = await mountSuspended(NameForm, { props: { initialName: "Mika" } });

        await form.get("input").setValue("Camille Roux");
        await form.get("form").trigger("submit");
        await vi.waitFor(() => expect(form.text()).toContain("Enregistré."));

        expect(received).toEqual({ name: "Camille Roux" });
        expect(form.emitted("saved")).toHaveLength(1);
      });
    });
  });

  describe("Given an agent who sends an empty name", () => {
    describe("When the server refuses", () => {
      test("Then the reason for the refusal is shown and nothing is confirmed", async () => {
        registerEndpoint("/api/compte/renommer", {
          method: "POST",
          handler: () => {
            throw createError({ statusCode: 400, data: { message: "Le nom est vide" } });
          },
        });
        const form = await mountSuspended(NameForm, { props: { initialName: "Mika" } });

        await form.get("input").setValue("");
        await form.get("form").trigger("submit");
        await vi.waitFor(() => expect(form.find("[role=alert]").exists()).toBe(true));

        expect(form.get("[role=alert]").text()).toBe("Le nom est vide");
        expect(form.text()).not.toContain("Enregistré.");
        expect(form.emitted("saved")).toBeUndefined();
      });
    });
  });
});
