import { expect, it } from "vitest";

import { repondre } from "@/server/utils/llm";

/** LLM : le modèle configuré répond. Ignoré (et listé) si le secret manque. */
const secrets = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
const manquants = secrets.filter((name) => !process.env[name]);

it.skipIf(manquants.length > 0)(`le modèle répond (secrets : ${secrets.join(", ")})`, async () => {
  Object.assign(process.env, {
    AUTH_SECRET: "contrat-sans-session-0123456789-0123456789",
    AUTH_KEYCLOAK_ISSUER: "https://auth.exemple.test/realms/contrat",
    AUTH_KEYCLOAK_ID: "contrat",
    AUTH_KEYCLOAK_SECRET: "contrat",
  });
  const text = await repondre("Réponds par un seul mot.", "Dis bonjour.");
  expect(text.trim().length).toBeGreaterThan(0);
});
