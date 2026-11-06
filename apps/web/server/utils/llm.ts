import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, type LanguageModel } from "ai";

import { env } from "./env";

export async function prompt(
  name: string,
  variables: Record<string, string> = {},
): Promise<string> {
  const fichier = path.join(process.cwd(), "prompts", `${path.basename(name)}.md`);
  const text = await readFile(fichier, "utf8");
  return text.replace(/\{(\w+)\}/g, (_tout, key: string) => {
    const value = variables[key];
    if (value === undefined) throw new Error(`Variable de prompt manquante : ${key}`);
    return value;
  });
}

export function modele(): LanguageModel {
  const e = env();
  return createAmazonBedrock({ region: e.AWS_REGION })(e.LLM_MODELE);
}

export async function repondre(systeme: string, message: string, model: LanguageModel = modele()) {
  const { text } = await generateText({
    model,
    system: systeme,
    prompt: message,
    maxOutputTokens: 1024,
  });
  return text;
}
