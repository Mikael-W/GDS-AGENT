import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { prompt, repondre } from "@/lib/llm";

describe("LLM", () => {
  it("lit le prompt hors du code et remplace ses variables", async () => {
    expect(await prompt("exemple", { nom_projet: "Projet test" })).toContain("Projet test");
  });

  it("signale une variable manquante", async () => {
    await expect(prompt("exemple")).rejects.toThrow(/nom_projet/);
  });

  it("renvoie le texte du modèle", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text: "Bonjour." }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
        warnings: [],
      }),
    });
    expect(await repondre("système", "question", model)).toBe("Bonjour.");
  });
});
