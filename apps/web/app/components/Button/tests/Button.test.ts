import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";

import Button from "../Button.vue";

describe("interface button", () => {
  describe("Given a button with default settings", () => {
    describe("When it is displayed with the text Enregistrer", () => {
      test("Then it carries that text and stays a plain button, without submitting a form", async () => {
        const button = await mountSuspended(Button, { slots: { default: "Enregistrer" } });

        expect(button.text()).toBe("Enregistrer");
        expect(button.attributes("type")).toBe("button");
      });

      test("Then it has the primary appearance", async () => {
        const button = await mountSuspended(Button, { slots: { default: "Enregistrer" } });

        expect(button.classes()).toContain("button--primary");
      });
    });
  });

  describe("Given a small outline button meant to submit a form", () => {
    describe("When it is displayed", () => {
      test("Then it takes that appearance and the submit type", async () => {
        const button = await mountSuspended(Button, {
          props: { variant: "outline", size: "small", type: "submit" },
        });

        expect(button.classes()).toEqual(
          expect.arrayContaining(["button--outline", "button--small"]),
        );
        expect(button.attributes("type")).toBe("submit");
      });
    });
  });

  describe("Given a disabled button", () => {
    describe("When it is displayed", () => {
      test("Then it cannot be used", async () => {
        const button = await mountSuspended(Button, { props: { disabled: true } });

        expect(button.attributes("disabled")).toBeDefined();
      });
    });
  });
});
