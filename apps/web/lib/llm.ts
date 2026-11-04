import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, type LanguageModel } from "ai";

import { env } from "@/lib/env";

/**
 * Client LLM minimal (Vercel AI SDK) : Bedrock, région eu-west-3 (Paris).
 * Les prompts vivent hors du code, dans prompts/<nom>.md, variables au format
 * {variable}.
 */
export async function prompt(nom: string, variables: Record<string, string> = {}): Promise<string> {
  const fichier = path.join(process.cwd(), "prompts", `${path.basename(nom)}.md`);
  const texte = await readFile(fichier, "utf8");
  return texte.replace(/\{(\w+)\}/g, (_tout, cle: string) => {
    const valeur = variables[cle];
    if (valeur === undefined) throw new Error(`Variable de prompt manquante : ${cle}`);
    return valeur;
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
