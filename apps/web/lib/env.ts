import "server-only";

import { z } from "zod";

/**
 * Réglages du serveur, lus dans l'environnement et validés au démarrage
 * (instrumentation.ts). En production, le serveur refuse de démarrer si un
 * réglage garde une valeur de développement : mieux vaut un conteneur qui ne
 * démarre pas (le déploiement revient à la version précédente) qu'une
 * application ouverte.
 */
export const SECRET_DE_DEV = "secret-de-developpement-a-ne-jamais-utiliser-en-prod";
const BASE_DE_DEV = "postgres://app:app@127.0.0.1:5440/app";

const schema = z
  .object({
    ENVIRONNEMENT: z.enum(["dev", "test", "prod"]).default("dev"),
    AUTH_SECRET: z.string().min(32),
    AUTH_KEYCLOAK_ISSUER: z.url(),
    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_SECRET: z.string().min(1),
    // Adresse publique du site, lue aussi par Auth.js (derrière Caddy, le
    // serveur ne la connaît pas) ; retour après déconnexion de Keycloak.
    AUTH_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.string().startsWith("postgres").default(BASE_DE_DEV),
    SENTRY_DSN: z.string().default(""),
    GIT_SHA: z.string().default("dev"),
    // Identifiants AWS lus par le SDK (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
    AWS_REGION: z.literal("eu-west-3").default("eu-west-3"),
    LLM_MODELE: z.string().default("eu.anthropic.claude-sonnet-4-5-20250929-v1:0"),
  })
  .superRefine((r, ctx) => {
    if (r.ENVIRONNEMENT !== "prod") return;
    const refuser = (message: string) => ctx.addIssue({ code: "custom", message });
    if (r.AUTH_SECRET === SECRET_DE_DEV) refuser("AUTH_SECRET garde la valeur de développement");
    if (!r.AUTH_KEYCLOAK_ISSUER.startsWith("https://"))
      refuser("AUTH_KEYCLOAK_ISSUER doit être en https");
    if (!r.AUTH_URL.startsWith("https://")) refuser("AUTH_URL doit être en https");
    if (r.DATABASE_URL === BASE_DE_DEV || r.DATABASE_URL.includes(":app@")) {
      refuser("DATABASE_URL garde le mot de passe de développement");
    }
    if (!r.SENTRY_DSN) refuser("SENTRY_DSN est vide (projet GlitchTip)");
    if (r.GIT_SHA === "dev") refuser("GIT_SHA absent : image construite hors CI");
  });

export type Env = z.infer<typeof schema>;

export function lireEnv(source: Record<string, string | undefined>): Env {
  const resultat = schema.safeParse(source);
  if (!resultat.success) {
    const detail = resultat.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")} : ${i.message}` : i.message))
      .join(" ; ");
    throw new Error(`Réglages refusés : ${detail}`);
  }
  return resultat.data;
}

let memo: Env | undefined;

export function env(): Env {
  memo ??= lireEnv(process.env);
  return memo;
}
